import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from app import config, orchestrator
from app.models import SearchRequest

app = FastAPI(title="RxRadar API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"ok": True, "mode": config.APP_MODE,
            "tinyfish_key_loaded": bool(config.TINYFISH_API_KEY)}


@app.post("/api/search")
async def start_search(req: SearchRequest):
    if req.mode == "replay":
        sid = orchestrator.start_replay()
    else:
        sid = _start(req)
    return {"search_id": sid}


@app.get("/api/search/{search_id}/stream")
async def stream(search_id: str):
    em = orchestrator.SEARCHES.get(search_id)
    if em is None:
        raise HTTPException(status_code=404, detail="unknown search_id")

    async def gen():
        while True:
            event, data = await em.q.get()
            yield {"event": event, "data": json.dumps(data, ensure_ascii=False)}
            if event == "done":
                break

    return EventSourceResponse(gen())


@app.get("/api/replay/latest")
async def replay_latest():
    sid = orchestrator.start_replay()
    if sid is None:
        raise HTTPException(status_code=404, detail="no saved live run yet")
    return {"search_id": sid}


from urllib.parse import quote as _q

from app.models import MonitorRequest
from app.tinyfish_client import create_fetch_monitor


@app.post("/api/monitor")
async def create_monitor(body: MonitorRequest):
    """Daily TinyFish fetch monitor on the PharmEasy search page for this salt."""
    em = orchestrator.SEARCHES.get(body.search_id)
    query = body.salt.replace("+", " ")
    if em is not None:
        for e in em.log:
            if e["event"] == "search_started":
                for m in e["data"]["medicines"]:
                    if m["salt"] == body.salt:
                        query = m["brand"]
    url = f"https://pharmeasy.in/search/all?name={_q(query)}"
    try:
        mid = await create_fetch_monitor(
            url, purpose=f"Alert when {body.salt} drops below Rs {body.target_per_unit}/tablet"
        )
    except Exception as ex:
        raise HTTPException(status_code=502, detail=str(ex)[:200])
    return {"monitor_id": str(mid), "schedule": "daily 9:00 AM", "status": "active"}


from app.salts import PRESETS


@app.get("/api/medicines")
def medicines():
    """Quick-pick presets for the UI dropdown (brand, salt, strength)."""
    return {"medicines": PRESETS}


from fastapi.staticfiles import StaticFiles

_static_dir = Path(__file__).resolve().parents[1] / "static"
_static_dir.joinpath("proofs").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


import datetime as _dt

_LIVE = {"day": None, "count": 0}


def _start(req):
    """Replay is always free. Live is capped per day to protect TinyFish credits."""
    if req.mode == "replay":
        return orchestrator.start_replay()
    today = _dt.date.today().isoformat()
    if _LIVE["day"] != today:
        _LIVE.update(day=today, count=0)
    if _LIVE["count"] >= config.LIVE_DAILY_LIMIT:
        raise HTTPException(status_code=429, detail="Live searches are paused for today to protect credits. Switch to Replay to see a recorded live run.")
    _LIVE["count"] += 1
    return orchestrator.start(req)
