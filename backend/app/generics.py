import re
from typing import Optional

from app.salts import NTI_SALTS, compact_strength, validate
from app.tinyfish_client import web_search

TRUSTED = ("janaushadhi", "pmbi")
_PRICE = re.compile(r"(?:\u20b9|rs\.?)\s*(\d+(?:\.\d+)?)", re.I)
_PACK = re.compile(r"(\d+)\s*(?:tablets?|capsules?|'s\b|s\b)", re.I)


def _host(url: str, site: str) -> str:
    return (url.split("/")[2] if "//" in url else site).lower()


async def jan_aushadhi(salt: str, strength: str) -> Optional[dict]:
    """Government generic (Jan Aushadhi) option via TinyFish Search. NTI drugs skipped."""
    if salt in NTI_SALTS:
        return None
    q = f"Jan Aushadhi {salt.replace('+', ' ')} {compact_strength(strength)} tablet price"
    for r in await web_search(q):
        host = _host(r["url"], r["site"])
        if not any(t in host for t in TRUSTED):
            continue
        title = re.sub(r"\b\d+\s*s\b", " ", r["title"], flags=re.I)  # drop '15s' pack marker
        ok, _ = validate({"name": title, "composition": None}, salt, strength)
        if not ok:
            continue
        pm = _PRICE.search(r["snippet"]) or _PRICE.search(r["title"])
        km = _PACK.search(r["snippet"]) or _PACK.search(r["title"])
        if not pm or not km:
            continue
        price, pack = float(pm.group(1)), int(km.group(1))
        if pack <= 0 or price <= 0:
            continue
        per_unit = round(price / pack, 2)
        if per_unit > 100:
            continue
        return {
            "name": r["title"][:90],
            "per_unit": per_unit,
            "pack_qty": pack,
            "price": price,
            "source": host.removeprefix("www."),
            "url": r["url"],
        }
    return None
