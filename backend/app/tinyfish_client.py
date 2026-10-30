import asyncio
import json
from typing import Callable, Optional

from tinyfish import AsyncTinyFish, AgentConfig, BrowserProfile, CompleteEvent, ProxyConfig

from app import config


class AgentTimeout(Exception):
    pass


class AgentFailed(Exception):
    pass


_client = None


def client() -> AsyncTinyFish:
    global _client
    if _client is None:
        _client = AsyncTinyFish(api_key=config.TINYFISH_API_KEY, max_retries=1)
    return _client


async def fetch_markdown(urls: list[str], timeout_ms: int = 45000) -> dict[str, str]:
    """Fast path: TinyFish fetch (no browser). Returns {url: markdown_text}."""
    resp = await client().fetch.get_contents(
        urls,
        format="markdown",
        links=False,
        image_links=False,
        per_url_timeout_ms=timeout_ms,
    )
    out: dict[str, str] = {}
    for r in resp.results:
        out[r.url] = getattr(r, "text", "") or ""
    return out


async def run_agent_stream(
    url: str,
    goal: str,
    output_schema: dict,
    on_live_url: Optional[Callable[[str], None]] = None,
    on_progress: Optional[Callable[[str], None]] = None,
    timeout_s: Optional[int] = None,
    max_steps: Optional[int] = None,
) -> Optional[dict]:
    """Slow path: TinyFish browser agent with live streaming."""
    timeout_s = timeout_s or config.AGENT_TIMEOUT_S

    agent_cfg = {"max_duration_seconds": timeout_s}
    if max_steps:
        agent_cfg["max_steps"] = max_steps

    kwargs = dict(
        goal=goal,
        url=url,
        browser_profile=BrowserProfile.STEALTH,
        proxy_config=ProxyConfig(enabled=True, country_code="IN"),
        output_schema=output_schema,
        agent_config=AgentConfig(**agent_cfg),
    )
    if on_live_url:
        kwargs["on_streaming_url"] = lambda e: on_live_url(e.streaming_url)
    if on_progress:
        kwargs["on_progress"] = lambda e: on_progress(getattr(e, "purpose", "") or "")

    async def _run() -> Optional[dict]:
        result = None
        async with client().agent.stream(**kwargs) as stream:
            async for event in stream:
                if isinstance(event, CompleteEvent):
                    status = str(getattr(event, "status", "")).upper()
                    if "COMPLETED" not in status:
                        raise AgentFailed(str(getattr(event, "error", None) or status))
                    result = getattr(event, "result_json", None)
                    if isinstance(result, str):
                        result = json.loads(result)
        return result

    try:
        return await asyncio.wait_for(_run(), timeout=timeout_s + 15)
    except asyncio.TimeoutError:
        raise AgentTimeout(f"agent exceeded {timeout_s}s on {url}")


async def create_fetch_monitor(url: str, purpose: str) -> str:
    """Daily fetch monitor at 03:29 UTC (~9 AM IST)."""
    created = await client().monitors.create(
        "fetch",
        {"url": url, "format": "markdown"},
        "29 3 * * *",
        purpose=purpose,
    )
    return created.monitor.id


# --- Stall protection: fetch sometimes never returns. Hard timeout + 1 retry. ---
_raw_fetch_markdown = fetch_markdown


async def fetch_markdown(urls: list[str], timeout_ms: int = 15000) -> dict[str, str]:
    for _ in range(2):
        try:
            return await asyncio.wait_for(
                _raw_fetch_markdown(urls, timeout_ms), timeout=timeout_ms / 1000 + 5
            )
        except asyncio.TimeoutError:
            continue
    return {}


async def web_search(query: str, timeout_s: int = 10) -> list[dict]:
    """TinyFish Search (free). Returns [{title, snippet, url, site}]."""
    resp = None
    for kwargs in ({"location": "IN", "language": "en"}, {}):
        try:
            resp = await asyncio.wait_for(client().search.query(query, **kwargs), timeout=timeout_s)
            break
        except Exception:
            continue
    out = []
    for r in (getattr(resp, "results", None) or []):
        out.append({
            "title": getattr(r, "title", "") or "",
            "snippet": getattr(r, "snippet", "") or "",
            "url": getattr(r, "url", "") or "",
            "site": getattr(r, "site_name", "") or "",
        })
    return out


async def estimate_cost(since_epoch: float) -> dict:
    """Real TinyFish cost of agent runs created since this search started."""
    from datetime import datetime, timezone
    from app import config as _cfg

    since = datetime.fromtimestamp(since_epoch - 5, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    resp = await asyncio.wait_for(client().runs.list(created_after=since, limit=20), timeout=10)
    steps, minutes, n = 0, 0.0, 0
    for r in getattr(resp, "data", []) or []:
        n += 1
        steps += getattr(r, "num_of_steps", 0) or 0
        s, f = getattr(r, "started_at", None), getattr(r, "finished_at", None)
        if s and f:
            minutes += (f - s).total_seconds() / 60
    usd = steps * 0.016 + minutes * 0.002
    return {"agent_runs": n, "agent_steps": steps, "browser_minutes": round(minutes, 1),
            "usd": round(usd, 3), "inr": round(usd * _cfg.USD_INR, 1),
            "note": "Fetch + Search are free; cost is browser agents only"}
