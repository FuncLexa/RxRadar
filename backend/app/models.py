from typing import Literal
from pydantic import BaseModel, Field, model_validator


class Medicine(BaseModel):
    brand: str
    salt: str
    strength: str
    per_day: float = Field(gt=0)
    hero: bool = False


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
