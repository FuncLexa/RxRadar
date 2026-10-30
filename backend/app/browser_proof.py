import asyncio
import os
from urllib.parse import quote

import httpx

from app import config

BROWSER_API = "https://api.browser.tinyfish.ai/"
PROOF_DIR = os.path.join("static", "proofs")

HIGHLIGHT_JS = """
(name) => {
  const els = Array.from(document.querySelectorAll('h1,h2,h3,h4,a,div,span'));
  const hit = els.find(e => e.childElementCount === 0 && e.textContent.trim().toLowerCase().startsWith(name.toLowerCase()));
  if (!hit) return false;
  let card = hit;
  for (let i = 0; i < 4 && card.parentElement; i++) card = card.parentElement;
  card.style.outline = '5px solid #E76F51';
  card.style.outlineOffset = '4px';
  card.style.borderRadius = '10px';
  card.scrollIntoView({block: 'center'});
  return true;
}
"""


async def _create_session(url: str, timeout_s: int = 40) -> dict:
    async with httpx.AsyncClient(timeout=30) as h:
        r = await h.post(
            BROWSER_API,
            headers={"X-API-Key": config.TINYFISH_API_KEY, "Content-Type": "application/json"},
            json={"url": url, "timeout_seconds": timeout_s,
                  "proxy_config": {"enabled": True, "type": "tinyfish", "country_code": "IN"}},
        )
        r.raise_for_status()
        return r.json()


async def _shoot(query: str, product_name: str, tag: str) -> dict:
    from playwright.async_api import async_playwright

    url = f"https://pharmeasy.in/search/all?name={quote(query)}"
    session = await _create_session(url)
    os.makedirs(PROOF_DIR, exist_ok=True)
    path = os.path.join(PROOF_DIR, f"{tag}.png")
    short = product_name.split(" Strip")[0].split(" Bottle")[0]

    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(session["cdp_url"])
        try:
            ctx = browser.contexts[0] if browser.contexts else await browser.new_context()
            page = ctx.pages[0] if ctx.pages else await ctx.new_page()
            if "pharmeasy" not in page.url:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            try:
                await page.wait_for_load_state("networkidle", timeout=12000)
            except Exception:
                pass
            await page.set_viewport_size({"width": 1280, "height": 800})
            found = await page.evaluate(HIGHLIGHT_JS, short)
            await page.wait_for_timeout(500)
            await page.screenshot(path=path, full_page=False)
        finally:
            await browser.close()

    return {"image": "/" + path.replace(os.sep, "/"), "highlighted": bool(found),
            "product": short, "source_url": url, "session_id": session.get("session_id")}


async def proof_screenshot(query: str, product_name: str, tag: str, timeout_s: int = 60):
    """TinyFish Browser API: open the real pharmacy page, highlight the product, screenshot it."""
    try:
        return await asyncio.wait_for(_shoot(query, product_name, tag), timeout=timeout_s)
    except Exception as e:
        return {"error": str(e)[:200]}


# --- Windows fix: uvicorn's event loop can't spawn Playwright's driver, so run it in its own thread/loop ---
import sys as _sys


def _shoot_in_thread(query, product_name, tag):
    loop = asyncio.ProactorEventLoop() if _sys.platform == "win32" else asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_shoot(query, product_name, tag))
    finally:
        loop.close()


async def proof_screenshot(query: str, product_name: str, tag: str, timeout_s: int = 60):
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_shoot_in_thread, query, product_name, tag), timeout=timeout_s
        )
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"[:200]}
