import re
from typing import Callable, Optional
from urllib.parse import quote

from app.tinyfish_client import fetch_markdown, run_agent_stream

RUPEE = "\u20b9"
_PRICE_RE = re.compile(RUPEE + r"\s*([\d,]+(?:\.\d+)?)")
_PE_PACK_RE = re.compile(r"(\d+)\s*(?:Tablet|Capsule)\(s\)", re.I)
_PACK_RE = re.compile(r"(\d+)\s*(?:tablets?|capsules?|tabs?|caps?)\b", re.I)
_PACK_OF_RE = re.compile(r"of\s+(\d+)", re.I)
_PACK_S_RE = re.compile(r"(\d+)'s", re.I)

AGENT_SCHEMA_1MG = {
    "type": "object",
    "properties": {
        "products": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "strength": {"type": "string"},
                    "pack_size": {"type": "string"},
                    "price": {"type": "number"},
                    "mrp": {"type": "number"},
                },
            },
        }
    },
    "required": ["products"],
}

AGENT_SCHEMA_APOLLO = {
    "type": "object",
    "properties": {
        "products": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "composition": {"type": "string"},
                    "pack_size": {"type": "string"},
                    "price": {"type": "number"},
                    "mrp": {"type": "number"},
                },
            },
        }
    },
    "required": ["products"],
}

GOAL_1MG = (
    "Do not scroll and do not open product pages. Read only the first 5 product cards "
    "visible at the top of the search results and return name, strength, pack size, "
    "selling price (Rs) and MRP (Rs) for each. If a location popup appears, close it."
)

GOAL_APOLLO = (
    "Do not scroll, do not log in, do not set a pincode and do not open product pages. "
    "If a popup appears, close it. Read only the first 5 product cards visible at the top "
    "of the search results and return name, composition, pack size, selling price (Rs) "
    "and MRP (Rs) for each."
)


def parse_pack_qty(*texts) -> Optional[int]:
    for t in texts:
        if not t:
            continue
        for rx in (_PACK_RE, _PACK_OF_RE, _PACK_S_RE):
            m = rx.search(t)
            if m:
                return int(m.group(1))
    return None


def parse_pharmeasy(md: str) -> list[dict]:
    """Each product block starts with '# <Name>'. First rupee value = price, second = MRP."""
    products = []
    blocks = re.split(r"^# ", md, flags=re.M)
    for block in blocks[1:]:
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        if not lines:
            continue
        name = lines[0]
        body = "\n".join(lines[1:])
        prices = [float(p.replace(",", "")) for p in _PRICE_RE.findall(body)]
        if not prices:
            continue
        m = _PE_PACK_RE.search(body)
        pack_qty = int(m.group(1)) if m else parse_pack_qty(name)
        products.append(
            {
                "name": name,
                "pack_qty": pack_qty,
                "price": prices[0],
                "mrp": prices[1] if len(prices) > 1 else None,
                "composition": None,
            }
        )
    return products


def _from_agent(result: Optional[dict], comp_key: str) -> list[dict]:
    out = []
    for p in (result or {}).get("products", []) or []:
        if p.get("price") is None:
            continue
        out.append(
            {
                "name": p.get("name", ""),
                "pack_qty": parse_pack_qty(p.get("pack_size"), p.get("name")),
                "price": float(p["price"]),
                "mrp": float(p["mrp"]) if p.get("mrp") is not None else None,
                "composition": p.get(comp_key),
            }
        )
    return out


async def pharmeasy(brand: str) -> list[dict]:
    url = f"https://pharmeasy.in/search/all?name={quote(brand)}"
    res = await fetch_markdown([url])
    md = next(iter(res.values()), "") if res else ""
    return parse_pharmeasy(md)


async def onemg(
    salt: str,
    on_live_url: Optional[Callable[[str], None]] = None,
    on_progress: Optional[Callable[[str], None]] = None,
) -> list[dict]:
    query = salt.replace("+", " ")
    url = f"https://www.1mg.com/search/all?name={quote(query)}"
    result = await run_agent_stream(
        url, GOAL_1MG, AGENT_SCHEMA_1MG, on_live_url, on_progress, max_steps=None
    )
    return _from_agent(result, "strength")


async def apollo(
    brand: str,
    on_live_url: Optional[Callable[[str], None]] = None,
    on_progress: Optional[Callable[[str], None]] = None,
) -> list[dict]:
    url = f"https://www.apollopharmacy.in/search-medicines/{quote(brand)}"
    result = await run_agent_stream(
        url, GOAL_APOLLO, AGENT_SCHEMA_APOLLO, on_live_url, on_progress, max_steps=None
    )
    return _from_agent(result, "composition")


async def pharmeasy_multi(queries: list[str]) -> list[dict]:
    """One free fetch call with several search URLs (brand + salt); merged, de-duplicated."""
    urls = [f"https://pharmeasy.in/search/all?name={quote(q)}" for q in queries]
    res = await fetch_markdown(urls)
    seen, out = set(), []
    for md in res.values():
        for p in parse_pharmeasy(md):
            if p["name"] not in seen:
                seen.add(p["name"])
                out.append(p)
    return out


async def pharmeasy_multi(queries: list[str], timeout_ms: int = 8000) -> list[dict]:
    """Each search URL fetched separately in parallel; slow/stalled URLs are skipped."""
    import asyncio

    async def one(q: str) -> str:
        url = f"https://pharmeasy.in/search/all?name={quote(q)}"
        try:
            res = await asyncio.wait_for(fetch_markdown([url], timeout_ms), timeout=timeout_ms / 1000 + 2)
            return next(iter(res.values()), "") if res else ""
        except Exception:
            return ""

    pages = await asyncio.gather(*(one(q) for q in queries))
    seen, out = set(), []
    for md in pages:
        for p in parse_pharmeasy(md):
            if p["name"] not in seen:
                seen.add(p["name"])
                out.append(p)
    return out


_PE_SEM = None


async def pharmeasy_multi(queries: list[str], timeout_ms: int = 12000) -> list[dict]:
    """Max 6 TinyFish fetches in flight at once; each URL single attempt, skipped if slow."""
    import asyncio
    from app.tinyfish_client import _raw_fetch_markdown

    global _PE_SEM
    if _PE_SEM is None:
        _PE_SEM = asyncio.Semaphore(8)

    async def one(q: str) -> str:
        url = f"https://pharmeasy.in/search/all?name={quote(q)}"
        async with _PE_SEM:
            try:
                res = await asyncio.wait_for(_raw_fetch_markdown([url], timeout_ms), timeout=timeout_ms / 1000 + 2)
                return next(iter(res.values()), "") if res else ""
            except Exception:
                return ""

    pages = await asyncio.gather(*(one(q) for q in queries))
    seen, out = set(), []
    for md in pages:
        for p in parse_pharmeasy(md):
            if p["name"] not in seen:
                seen.add(p["name"])
                out.append(p)
    return out


# --- v2 goals: wait for results to load; agents were reading the page too early ---
GOAL_1MG = (
    "Wait until the search results have fully loaded and the product cards show prices. "
    "If a location popup appears, close it. Do not open product pages and do not log in. "
    "Read the first 5 product cards in the search results and return name, strength, "
    "pack size, selling price (Rs) and MRP (Rs) for each. Only report products and prices "
    "you can actually see on the page; if none are visible yet, wait and look again."
)

GOAL_APOLLO = (
    "Wait until the search results have fully loaded and the product cards show prices. "
    "If a popup appears, close it. Do not open product pages, do not log in and do not set a pincode. "
    "Read the first 5 product cards in the search results and return name, composition, "
    "pack size, selling price (Rs) and MRP (Rs) for each. Only report products and prices "
    "you can actually see on the page; never repeat the same product."
)

_from_agent_raw = _from_agent


def _from_agent(result, comp_key):
    seen, out = set(), []
    for p in _from_agent_raw(result, comp_key):
        k = (p["name"].strip().lower(), p["price"])
        if k not in seen:
            seen.add(k)
            out.append(p)
    return out
