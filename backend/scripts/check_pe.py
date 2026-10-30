import asyncio
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.pharmacies import pharmeasy_multi
from app.salts import check, pharmeasy_queries

M = [
    ("Jalra M", "vildagliptin+metformin", "50mg/500mg"),
    ("Novastat 10", "rosuvastatin", "10mg"),
    ("Thyronorm 50", "levothyroxine", "50mcg"),
]


async def main():
    t = time.time()
    results = await asyncio.gather(
        *(pharmeasy_multi(pharmeasy_queries(b, s, st, limit=6)) for b, s, st in M)
    )
    for (b, s, st), r in zip(M, results):
        checked = [check(p, s, st) for p in r]
        valid = sorted([c for c in checked if c["salt_match"]], key=lambda c: c["per_unit"])
        print(f"{b} | valid: {len(valid)} | total: {len(r)}")
        for c in valid[:3]:
            print("    ", c["per_unit"], c["name"])
    print("SECONDS", round(time.time() - t, 1))


asyncio.run(main())
