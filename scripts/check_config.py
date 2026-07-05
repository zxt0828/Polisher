"""Debug script to verify ANTHROPIC_API_KEY / ANTHROPIC_MODEL are loaded from .env."""

from app.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL

print(f"ANTHROPIC_MODEL: {ANTHROPIC_MODEL}")

if ANTHROPIC_API_KEY is None:
    print("ANTHROPIC_API_KEY not found! Check that .env exists and is loaded correctly.")
else:
    print(f"ANTHROPIC_API_KEY: {ANTHROPIC_API_KEY[:15]}...")
