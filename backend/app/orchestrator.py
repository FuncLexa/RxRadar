import asyncio
import json
import os
import time
import uuid

from app import config
from app.models import SearchRequest
from app.optimiser import build_summary
from app.pharmacies import apollo, onemg, pharmeasy_multi
from app.salts import check, pharmeasy_queries
from app.tinyfish_client import AgentTimeout

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


def _trim(prods: list) -> list:
    """Cheapest valid first (max 6), then up to 2 rejected to show the validator working."""
    ok = sorted([p for p in prods if p["salt_match"]], key=lambda p: p["per_unit"])
    bad = [p for p in prods if not p["salt_match"]]
    return ok[:6] + bad[:2]


async def run_search(req: SearchRequest, em: Emitter):
    meds = req.medicines
    hero = next(m for m in meds if m.hero)
    results: dict = {}
    sources_done: list = []

    def summary(final=False):
        em.emit("summary", build_summary(req, results, sources_done, final))

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
                                     "strength": m.strength, "products": prods}); summary()

        await asyncio.gather(*(one(m) for m in meds), return_exceptions=True)
        status("pharmeasy", "done", f"{len(meds)} medicines priced", t0)
        sources_done.append("pharmeasy")
        summary()

    try:
        em.emit("search_started", {"search_id": em.search_id, "pharmacies": PHARMACIES,
                                   "medicines": [m.model_dump() for m in meds]})
        # Slow agents first, then the fast fetch, all concurrently
        agents = [
            asyncio.create_task(run_agent("1mg", onemg, hero.salt)),
            asyncio.create_task(run_agent("apollo", apollo, hero.brand)),
        ]
        await run_pharmeasy()
        await asyncio.gather(*agents)
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


def _brand_key(brand: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]", "", re.sub(r"\s*\d.*$", "", brand or "").lower())


def _trim(prods: list, brand: str = "") -> list:
    """Cheapest 6 valid + user's own brand (always) + up to 2 rejected."""
    import re
    key = _brand_key(brand)
    ok = sorted([p for p in prods if p["salt_match"]], key=lambda p: p["per_unit"])
    keep = ok[:6]
    for p in ok[6:]:
        if key and key in re.sub(r"[^a-z0-9]", "", p["name"].lower()):
            keep.append(p)
    bad = [p for p in prods if not p["salt_match"]]
    return keep + bad[:2]
