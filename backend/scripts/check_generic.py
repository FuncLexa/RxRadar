import asyncio, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.generics import jan_aushadhi

async def main():
    for s, st in [("vildagliptin+metformin", "50mg/500mg"), ("rosuvastatin", "10mg"), ("levothyroxine", "50mcg")]:
        print(s, "->", await jan_aushadhi(s, st))

asyncio.run(main())
