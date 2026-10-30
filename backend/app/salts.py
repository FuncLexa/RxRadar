import re
from typing import Optional

NTI_SALTS = {
    "levothyroxine", "warfarin", "phenytoin", "carbamazepine",
    "lithium", "digoxin", "tacrolimus", "cyclosporine",
}

SALT_DB = {
    "vildagliptin+metformin": {
        "brands": ["Galvus Met", "Vildamac M", "Somglip M", "Vildagard M", "Torglip M",
                   "Zomelis Met", "Vildapride M", "Vilcrown Met", "Vildasmart M",
                   "Galvamark Met", "Vildanol MF", "Vildader Met", "Verifica M",
                   "Zukanorm M", "Jalra M"],
        "reject_words": ["dp", "trio", "od"],
    },
    "rosuvastatin": {
        "brands": ["Novastat", "Rosuvas", "Roseday", "Rozat", "Rxtor", "Rozavel",
                   "Rosulip", "Crestor"],
        "reject_words": ["cv", "ez", "tg", "gold", "f", "a", "asp", "fenofibrate",
                         "aspirin", "clopidogrel", "ezetimibe"],
    },
    "levothyroxine": {
        "brands": ["Thyronorm", "Eltroxin", "Thyrox", "Thyroneed", "Euthyrox",
                   "Thyroup", "Lethyrox"],
        "reject_words": [],
    },
}

_PACK_PATTERNS = [
    re.compile(r"\b(?:strip|bottle|pack|box|tube|vial)\s+of\s+\d+[^,;)]*", re.I),
    re.compile(r"\b\d+\s*(?:tablets?|capsules?|tabs?|caps?)\b", re.I),
    re.compile(r"\b\d+'s\b", re.I),
]
_NUM_RE = re.compile(r"\d+(?:\.\d+)?")


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def _strip_pack(text: str) -> str:
    for rx in _PACK_PATTERNS:
        text = rx.sub(" ", text)
    return text


def _nums(text: str) -> set[str]:
    return {n.rstrip("0").rstrip(".") if "." in n else n for n in _NUM_RE.findall(text)}


def compact_strength(strength: str) -> str:
    """'50mg/500mg' -> '50/500', '10mg' -> '10mg', '50mcg' -> '50mcg'."""
    if "/" in strength:
        return "/".join(_NUM_RE.findall(strength))
    return strength


def pharmeasy_queries(brand: str, salt: str, strength: str, limit: int = 10) -> list[str]:
    """PharmEasy search is inconsistent, so query several ways in one free fetch call."""
    s = compact_strength(strength)
    qs = [brand, f"{brand} {s}", f"{salt.replace('+', ' ')} {s}"]
    qs += [f"{b} {s}" for b in SALT_DB.get(salt, {}).get("brands", [])]
    out, seen = [], set()
    for q in qs:
        k = q.lower().strip()
        if k not in seen:
            seen.add(k)
            out.append(q.strip())
    return out[:limit]


def validate(product: dict, salt: str, strength: str) -> tuple[bool, Optional[str]]:
    """Same salt + same strength only. Unknown brands are rejected, never guessed."""
    text = f"{product.get('name', '')} {product.get('composition') or ''}"
    low = text.lower()
    info = SALT_DB.get(salt, {"brands": [], "reject_words": []})

    for w in info["reject_words"]:
        if re.search(rf"\b{re.escape(w)}\b", low):
            return False, f"different formulation ({w.upper()})"

    salt_words = salt.split("+")
    brand_hit = any(_norm(b) in _norm(text) for b in info["brands"])
    salt_hit = all(w in low for w in salt_words)
    if not (brand_hit or salt_hit):
        return False, "unverified brand"

    need = _nums(strength)
    have = _nums(_strip_pack(text))
    if not have:
        return (True, None) if brand_hit else (False, "strength not shown")
    if not need.issubset(have) or (have - need):
        return False, "different strength"
    return True, None


def normalise(product: dict) -> dict:
    p = dict(product)
    qty = p.get("pack_qty")
    p["per_unit"] = round(p["price"] / qty, 2) if qty else None
    return p


def check(product: dict, salt: str, strength: str) -> dict:
    p = normalise(product)
    ok, reason = validate(p, salt, strength)
    if p["per_unit"] is None:
        ok, reason = False, "unknown pack size"
    p["salt_match"] = ok
    p["reject_reason"] = reason
    return p


# ---- Extended coverage: common chronic salts (brands from 21 Oct PharmEasy study) ----
SALT_DB.update({
    "sitagliptin+metformin": {
        "brands": ["Janumet", "Istamet", "Sitared M", "Sitaglo M", "Sitaxa M", "Zavamet",
                   "Sitamax M", "Lupisit M"],
        "reject_words": ["xr", "cp", "od"],
    },
    "glimepiride": {
        "brands": ["Amaryl", "Zoryl", "Glimy", "Glimestar", "Azulix", "GP"],
        "reject_words": ["m", "mv", "forte", "pg", "trio"],
    },
    "telmisartan": {
        "brands": ["Telma", "Telvas", "Telista", "Telmed", "Telsar", "Tazloc"],
        "reject_words": ["am", "h", "ct", "ah", "beta", "trio", "ln", "r"],
    },
    "amlodipine": {
        "brands": ["Amlong", "Stamlo", "Amlopin", "Amlodac", "Amlovas", "Amlip"],
        "reject_words": ["a", "tl", "at", "l", "m", "beta", "h"],
    },
    "clopidogrel": {
        "brands": ["Clopilet", "Clopitab", "Deplatt", "Plavix", "Clavix"],
        "reject_words": ["cv", "a", "asp", "gold", "f"],
    },
    "atorvastatin": {
        "brands": ["Atorva", "Lipvas", "Storvas", "Tonact", "Aztor", "Atocor"],
        "reject_words": ["asp", "f", "ez", "cv", "gold", "fenofibrate", "ezetimibe", "aspirin"],
    },
})

PRESETS = [
    {"brand": "Jalra M", "salt": "vildagliptin+metformin", "strength": "50mg/500mg"},
    {"brand": "Janumet", "salt": "sitagliptin+metformin", "strength": "50mg/500mg"},
    {"brand": "Amaryl 1", "salt": "glimepiride", "strength": "1mg"},
    {"brand": "Novastat 10", "salt": "rosuvastatin", "strength": "10mg"},
    {"brand": "Atorva 10", "salt": "atorvastatin", "strength": "10mg"},
    {"brand": "Telma 40", "salt": "telmisartan", "strength": "40mg"},
    {"brand": "Amlong 5", "salt": "amlodipine", "strength": "5mg"},
    {"brand": "Clopilet 75", "salt": "clopidogrel", "strength": "75mg"},
    {"brand": "Thyronorm 50", "salt": "levothyroxine", "strength": "50mcg"},
]


# ---- Combo markers found in live data (30 Oct) ----
SALT_DB["glimepiride"]["reject_words"] += ["mf", "p", "v", "pm"]
SALT_DB["telmisartan"]["reject_words"] += ["amh", "mt", "cl", "ch", "md"]
SALT_DB["amlodipine"]["reject_words"] += ["lo", "s", "b", "nb"]
SALT_DB["atorvastatin"]["reject_words"] += ["a", "c", "d"]

SALT_DB['vildagliptin+metformin']['brands'].append('Vigliptin M')
