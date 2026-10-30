import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from app import config, orchestrator
from app.models import SearchRequest

app = FastAPI(title="RxRadar API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"ok": True, "mode": config.APP_MODE,
            "tinyfish_key_loaded": bool(config.TINYFISH_API_KEY)}


@app.post("/api/search")
async def start_search(req: SearchRequest):
    sid = orchestrator.start_replay() if req.mode == "replay" else orchestrator.start(req); return {"search_id": sid}


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
