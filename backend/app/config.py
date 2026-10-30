import os
from dotenv import load_dotenv

load_dotenv()

TINYFISH_API_KEY = os.getenv("TINYFISH_API_KEY", "")
APP_MODE = os.getenv("APP_MODE", "live")
AGENT_TIMEOUT_S = int(os.getenv("AGENT_TIMEOUT_S", "150"))
REPLAY_SPEED = float(os.getenv("REPLAY_SPEED", "1.0"))
CACHE_DIR = os.getenv("CACHE_DIR", "cache")
