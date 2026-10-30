import asyncio
import glob
import json
import os
import re
import time
import uuid

from app import config
from app.generics import jan_aushadhi
from app.models import SearchRequest
from app.optimiser import build_summary
from app.pharmacies import apollo, onemg, pharmeasy_multi
from app.salts import check, pharmeasy_queries
from app.tinyfish_client import AgentTimeout, estimate_cost

PHARMACIES = ["pharmeasy", "1mg", "apollo"]
SEARCHES: dict = {}


class Emitter:
    def __init__(self, search_id: str):
        self.search_id = search_id
        self.q: asyncio.Queue = asyncio.Queue()
        self.t0 = time.time()
        self.log: list = []
        self.task = None

    def emit(self, event: str, data: dict):
        t_ms = round((time.time() - self.t0) * 1000)
        self.log.append({"t_ms": t_ms, "event": event, "data": data})
        self.q.put_nowait((event, data))

    def save(self):
        os.makedirs(config.CACHE_DIR, exist_ok=True)
        path = os.path.join(config.CACHE_DIR, f"{self.search_id}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"search_id": self.search_id, "events": self.log}, f, ensure_ascii=False, indent=1)


def _k(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def _brand_key(brand: str) -> str:
    return _k(re.sub(r"\s*\d.*$", "", brand or ""))


def _trim(prods: list, brand: str = "") -> list:
    """Cheapest 6 valid + the user's own brand (always) + up to 2 rejected."""
    key = _brand_key(brand)
    ok = sorted([p for p in prods if p["salt_match"]], key=lambda p: p["per_unit"])
    keep = ok[:6] + [p for p in ok[6:] if key and key in _k(p["name"])]
    bad = [p for p in prods if not p["salt_match"]]
    return keep + bad[:2]


async def run_search(req: SearchRequest, em: Emitter):
    meds = req.medicines
    hero = next(m for m in meds if m.hero)
    results: dict = {}
    sources_done: list = []

    def summary(final=False):
        em.emit("summary", {**build_summary(req, results, sources_done, final), "cost": getattr(em, "cost", None)})

    def status(pharmacy, s, msg, t0):
        em.emit("agent_status", {
            "pharmacy": pharmacy, "salt": hero.salt, "status": s,
            "message": msg, "elapsed_ms": round((time.time() - t0) * 1000),
        })

    async def run_agent(pharmacy: str, fn, arg: str):
        t0 = time.time()
        status(pharmacy, "starting", "Launching browser agent", t0)

        def on_live(url):
            em.emit("agent_live_url", {"pharmacy": pharmacy, "salt": hero.salt, "streaming_url": url})

        def on_progress(text):
            em.steps = getattr(em, "steps", 0) + 1
            low = (text or "").lower()
            s = "extracting" if any(k in low for k in ("extract", "price", "read", "return")) else "browsing"
            status(pharmacy, s, (text or "Working")[:140], t0)

        try:
            raw = await fn(arg, on_live, on_progress)
            prods = _trim([check(p, hero.salt, hero.strength) for p in raw], hero.brand)
            results[(pharmacy, hero.salt)] = prods
            em.emit("price_result", {"pharmacy": pharmacy, "salt": hero.salt,
                                     "strength": hero.strength, "products": prods})
            status(pharmacy, "done", f"{len(prods)} products found", t0)
        except AgentTimeout:
            status(pharmacy, "timeout", "Took too long - skipped", t0)
        except Exception as e:
            status(pharmacy, "failed", "Unavailable", t0)
            em.emit("error", {"pharmacy": pharmacy, "message": str(e)[:200]})
        em.agent_secs = getattr(em, "agent_secs", 0) + (time.time() - t0)
        sources_done.append(pharmacy)
        summary()

    async def run_pharmeasy():
        t0 = time.time()
        status("pharmeasy", "starting", "Fetching PharmEasy results", t0)

        async def one(m):
            raw = await pharmeasy_multi(pharmeasy_queries(m.brand, m.salt, m.strength, limit=5))
            prods = _trim([check(p, m.salt, m.strength) for p in raw], m.brand)
            results[("pharmeasy", m.salt)] = prods
            em.emit("price_result", {"pharmacy": "pharmeasy", "salt": m.salt,
                                     "strength": m.strength, "products": prods})
            summary()

        await asyncio.gather(*(one(m) for m in meds), return_exceptions=True)
        status("pharmeasy", "done", f"{len(meds)} medicines priced", t0)
        sources_done.append("pharmeasy")
        summary()

    async def run_generics():
        async def one(m):
            g = await jan_aushadhi(m.salt, m.strength)
            if g:
                results[("jan_aushadhi", m.salt)] = g
                em.emit("generic_option", {"salt": m.salt, **g})

        await asyncio.gather(*(one(m) for m in meds), return_exceptions=True)
        summary()

    try:
        em.emit("search_started", {"search_id": em.search_id, "pharmacies": PHARMACIES,
                                   "medicines": [m.model_dump() for m in meds]})
        agents = [
            asyncio.create_task(run_agent("1mg", onemg, hero.salt)),
            asyncio.create_task(run_agent("apollo", apollo, hero.brand)),
        ]
        generics = asyncio.create_task(run_generics())
        await run_pharmeasy()
        await asyncio.gather(*agents, generics)
        try:
            em.cost = local_cost(em)
            em.emit("cost", em.cost)
        except Exception:
            em.cost = None
        summary(final=True)
    except Exception as e:
        em.emit("error", {"pharmacy": None, "message": str(e)[:200]})
    finally:
        em.emit("done", {"search_id": em.search_id,
                         "duration_ms": round((time.time() - em.t0) * 1000)})
        em.save()


def start(req: SearchRequest) -> str:
    sid = "srch_" + uuid.uuid4().hex[:6]
    em = Emitter(sid)
    SEARCHES[sid] = em
    em.task = asyncio.create_task(run_search(req, em))
    return sid


# ---------------- Replay (stage safety net, zero TinyFish calls) ----------------

def _pick_replay_file():
    want = os.getenv("REPLAY_ID")
    if want:
        p = os.path.join(config.CACHE_DIR, f"{want}.json")
        return p if os.path.exists(p) else None
    files = sorted(glob.glob(os.path.join(config.CACHE_DIR, "srch_*.json")),
                   key=os.path.getmtime, reverse=True)
    for f in files:
        if "replay" in os.path.basename(f):
            continue
        try:
            ev = json.load(open(f, encoding="utf-8"))["events"]
        except Exception:
            continue
        done = any(e["event"] == "done" for e in ev)
        agent_hit = any(e["event"] == "price_result" and e["data"]["pharmacy"] != "pharmeasy"
                        and e["data"]["products"] for e in ev)
        if done and agent_hit:
            return f
    return None


async def run_replay(em: Emitter, path: str):
    ev = json.load(open(path, encoding="utf-8"))["events"]
    started = next(e for e in ev if e["event"] == "search_started")
    req = SearchRequest(pincode="560064", mode="replay", medicines=started["data"]["medicines"])
    results: dict = {}
    speed = max(config.REPLAY_SPEED, 0.1)
    prev = 0
    try:
        for e in ev:
            await asyncio.sleep(max(0, e["t_ms"] - prev) / 1000 / speed)
            prev = e["t_ms"]
            name, data = e["event"], e["data"]
            if name == "cost":
                em.cost = data
            if name == "agent_live_url":
                continue
            if name in ("search_started", "done"):
                data = {**data, "search_id": em.search_id}
            elif name == "price_result":
                results[(data["pharmacy"], data["salt"])] = data["products"]
            elif name == "generic_option":
                results[("jan_aushadhi", data["salt"])] = {k: v for k, v in data.items() if k != "salt"}
            elif name == "summary":
                data = {**build_summary(req, results, data.get("sources_done", []), data.get("final", False)), "cost": getattr(em, "cost", None)}
            em.emit(name, data)
    except Exception as ex:
        em.emit("error", {"pharmacy": None, "message": f"replay failed: {ex}"[:200]})
        em.emit("done", {"search_id": em.search_id, "duration_ms": prev})


def start_replay():
    path = _pick_replay_file()
    if not path:
        return None
    sid = "srch_replay_" + uuid.uuid4().hex[:4]
    em = Emitter(sid)
    SEARCHES[sid] = em
    em.task = asyncio.create_task(run_replay(em, path))
    return sid


def local_cost(em) -> dict:
    """TinyFish cost from this search's own agent steps + browser time (account rates)."""
    steps = getattr(em, "steps", 0)
    minutes = getattr(em, "agent_secs", 0) / 60
    usd = steps * 0.016 + minutes * 0.002
    return {"agent_steps": steps, "browser_minutes": round(minutes, 1),
            "usd": round(usd, 3), "inr": round(usd * config.USD_INR, 1),
            "note": "Fetch + Search are free; cost is browser agents only"}
