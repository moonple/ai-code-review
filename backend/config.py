import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
print(f"[CONFIG] 加载的 key: {ANTHROPIC_API_KEY[:15]}...{ANTHROPIC_API_KEY[-5:]}")