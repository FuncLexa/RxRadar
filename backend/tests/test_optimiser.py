import json
import os

import pytest

from app.models import SearchRequest
from app.optimiser import build_summary

CACHE = os.path.join("cache", "srch_a2bbb3.json")


@pytest.mark.skipif(not os.path.exists(CACHE), reason="saved live run not present")
def test_real_run():
    log = json.load(open(CACHE, encoding="utf-8"))["events"]
    req = SearchRequest(**json.load(open("sample_request.json")))
    results = {}
    for e in log:
        if e["event"] == "price_result":
            d = e["data"]
            results[(d["pharmacy"], d["salt"])] = d["products"]

    s = build_summary(req, results, ["pharmeasy", "1mg", "apollo"], final=True)
    vm, ro, lv = s["swaps"]

    assert vm["current"]["per_unit"] == 15.88          # Jalra M on PharmEasy
    assert vm["cheapest"]["per_unit"] == 9.33          # Vildanol MF on 1mg
    assert vm["cheapest"]["pharmacy"] == "1mg"
    assert vm["monthly_saving"] == 393.0               # (15.88-9.33) x 2/day x 30
    assert ro["current"]["per_unit"] == 18.61          # Novastat 10
    assert ro["cheapest"]["per_unit"] == 11.18         # Roseday 10
    assert ro["monthly_saving"] == 222.9
    assert lv["allowed"] is False and lv["monthly_saving"] == 0
    assert s["flags"][0]["salt"] == "levothyroxine"
    assert s["totals"]["monthly_saving"] == 615.9
    assert s["totals"]["annual_saving"] == 7390.8


def test_partial_data_does_not_crash():
    req = SearchRequest(**json.load(open("sample_request.json")))
    s = build_summary(req, {}, [], final=False)
    assert s["totals"]["annual_saving"] == 0
    assert "not found yet" in s["swaps"][0]["note"]
