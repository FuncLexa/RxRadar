import asyncio, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.pharmacies import pharmeasy_multi
from app.salts import PRESETS, check, pharmeasy_queries

async def one(m):
    raw = await pharmeasy_multi(pharmeasy_queries(m["brand"], m["salt"], m["strength"], limit=5))
    c = [check(p, m["salt"], m["strength"]) for p in raw]
    ok = sorted([x for x in c if x["salt_match"]], key=lambda x: x["per_unit"])
    bad = [x for x in c if not x["salt_match"]]
    return m, ok, bad

async def main():
    t = time.time()
    for m, ok, bad in await asyncio.gather(*(one(m) for m in PRESETS[1:8])):
        cheap = f'{ok[0]["per_unit"]} {ok[0]["name"][:35]}' if ok else "NONE"
        dear = f'{ok[-1]["per_unit"]} {ok[-1]["name"][:35]}' if ok else ""
        print(f'{m["brand"]:<12} valid={len(ok):<2} rejected={len(bad):<2} | cheapest {cheap} | priciest {dear}')
    print("SECONDS", round(time.time() - t, 1))

asyncio.run(main())
