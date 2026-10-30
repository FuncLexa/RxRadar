import asyncio, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.browser_proof import proof_screenshot

async def main():
    t = time.time()
    r = await proof_screenshot("Jalra M 50/500", "Somglip M 50/500Mg Strip Of 10 Tablets", "test_proof")
    print(r)
    print("SECONDS", round(time.time() - t, 1))

asyncio.run(main())
