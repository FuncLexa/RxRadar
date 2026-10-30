import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


def canon_salt(s: str) -> str:
    """'Vildagliptin + Metformin' / 'metformin and vildagliptin' -> 'vildagliptin+metformin'."""
    from app.salts import SALT_DB
    t = (s or "").lower().replace(" and ", "+").replace("&", "+").replace(",", "+")
    parts = [p.strip() for p in re.split(r"\s*\+\s*", t) if p.strip()]
    parts = [re.sub(r"\s+(hydrochloride|hcl|sodium|calcium|ip)\b", "", p).strip() for p in parts]
    key = "+".join(parts)
    if key in SALT_DB:
        return key
    for k in SALT_DB:
        if sorted(k.split("+")) == sorted(parts):
            return k
    return key


def canon_strength(s: str) -> str:
    """'50mg + 1000mg' -> '50mg/1000mg', '1g' -> '1000mg'."""
    t = (s or "").lower().replace(" ", "").replace("+", "/")
    return re.sub(r"(\d+(?:\.\d+)?)(gm|g)\b", lambda m: f"{int(float(m.group(1)) * 1000)}mg", t)


class Medicine(BaseModel):
    brand: str
    salt: str
    strength: str
    per_day: float = Field(gt=0)
    hero: bool = False

    @field_validator("salt")
    @classmethod
    def _salt(cls, v):
        return canon_salt(v)

    @field_validator("strength")
    @classmethod
    def _strength(cls, v):
        return canon_strength(v)


class SearchRequest(BaseModel):
    pincode: str = Field(pattern=r"^\d{6}$")
    mode: Literal["live", "replay"] = "live"
    medicines: list[Medicine] = Field(min_length=1)

    @model_validator(mode="after")
    def exactly_one_hero(self):
        if sum(m.hero for m in self.medicines) != 1:
            raise ValueError("exactly one medicine must have hero=true")
        return self


class MonitorRequest(BaseModel):
    search_id: str
    salt: str
    pharmacy: Literal["pharmeasy", "1mg", "apollo"]
    target_per_unit: float
