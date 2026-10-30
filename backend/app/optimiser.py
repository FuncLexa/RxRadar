import re

from app.salts import NTI_SALTS

NTI_MESSAGE = "Narrow therapeutic index - brand switching not advised. Consult your doctor."
COVERAGE = {"pharmeasy": "all", "1mg": "hero_only", "apollo": "hero_only"}


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def brand_key(brand: str) -> str:
    """'Novastat 10' -> 'novastat', 'Jalra M' -> 'jalram'."""
    return _norm(re.sub(r"\s*\d.*$", "", brand or ""))


def display_name(name: str) -> str:
    """'Roseday 10Mg Strip Of 15 Tablets' -> 'Roseday 10Mg'."""
    return re.sub(r"\s+(strip|bottle|pack|box)\s+of\b.*$", "", name or "", flags=re.I).strip()


def _r2(x: float) -> float:
    return round(x + 1e-9, 2)


def build_summary(req, results: dict, sources_done: list, final: bool = False) -> dict:
    """Recomputed after every price_result. Safe with partial data.
    current  = cheapest price of the user's OWN brand across pharmacies (conservative).
    cheapest = cheapest same-salt, same-strength product across pharmacies."""
    swaps, flags = [], []
    tot_cur = tot_opt = 0.0

    for m in req.medicines:
        valid = []
        for (pharmacy, salt), prods in results.items():
            if salt != m.salt:
                continue
            for p in prods:
                if p.get("salt_match") and p.get("per_unit"):
                    valid.append((pharmacy, p))

        key = brand_key(m.brand)
        own = [(ph, p) for ph, p in valid if key and key in _norm(p["name"])]
        cur = min(own, key=lambda x: x[1]["per_unit"]) if own else None
        best = min(valid, key=lambda x: x[1]["per_unit"]) if valid else None
        allowed = m.salt not in NTI_SALTS

        swap = {
            "salt": m.salt,
            "strength": m.strength,
            "allowed": allowed,
            "current": {
                "name": display_name(cur[1]["name"]) if cur else m.brand,
                "pharmacy": cur[0] if cur else None,
                "per_unit": cur[1]["per_unit"] if cur else None,
            },
            "cheapest": {
                "name": display_name(best[1]["name"]) if best else None,
                "pharmacy": best[0] if best else None,
                "per_unit": best[1]["per_unit"] if best else None,
            },
            "monthly_saving": 0.0,
            "annual_saving": 0.0,
        }

        if not allowed:
            flags.append({"salt": m.salt, "type": "NTI", "message": NTI_MESSAGE})
        elif cur and best:
            monthly = max(0.0, (cur[1]["per_unit"] - best[1]["per_unit"]) * m.per_day * 30)
            swap["monthly_saving"] = _r2(monthly)
            swap["annual_saving"] = _r2(monthly * 12)
            tot_cur += cur[1]["per_unit"] * m.per_day * 30
            tot_opt += min(cur[1]["per_unit"], best[1]["per_unit"]) * m.per_day * 30

        if allowed and not cur:
            pending = [ph for ph in (["pharmeasy", "1mg", "apollo"] if m.hero else ["pharmeasy"])
                       if ph not in sources_done]
            if pending and not final:
                swap["note"] = f"{m.brand} not found yet - checking {', '.join(pending)}"
            else:
                swap["note"] = f"{m.brand} not listed - showing cheapest same-salt option"

        swaps.append(swap)

    monthly_total = tot_cur - tot_opt
    return {
        "final": final,
        "sources_done": list(sources_done),
        "swaps": swaps,
        "flags": flags,
        "totals": {
            "current_monthly": _r2(tot_cur),
            "optimised_monthly": _r2(tot_opt),
            "monthly_saving": _r2(monthly_total),
            "annual_saving": _r2(monthly_total * 12),
        },
        "coverage": COVERAGE,
    }
