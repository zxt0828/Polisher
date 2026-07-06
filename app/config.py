"""Centralized reading of environment variables and configuration (model name, etc.)."""

import os

from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")
TAILOR_MODEL = os.getenv("TAILOR_MODEL", "claude-opus-4-8")
