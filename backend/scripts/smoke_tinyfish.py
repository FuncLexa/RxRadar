import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.tinyfish_client import fetch_markdown


async def main():
    url = "https://pharmeasy.in/search/all?name=jalra%20m"
    res = await fetch_markdown([url])
    for u, text in res.items():
        print("URL:", u, "| chars:", len(text))
        print(text[:500])


asyncio.run(main())
