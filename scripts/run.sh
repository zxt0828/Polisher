#!/usr/bin/env bash
# Starts the dev server.
#
# WeasyPrint's Python bindings load Pango/Cairo (native C libraries installed
# via Homebrew) at import time through cffi's dlopen. On macOS, dlopen can't
# find them on the default search path, so the dynamic linker needs an
# explicit hint via DYLD_FALLBACK_LIBRARY_PATH — and it has to be set in the
# shell *before* the Python process starts (setting it from within Python,
# e.g. via .env/os.environ, is too late for dlopen to pick it up).
#
# This is macOS-local-dev-only. On Linux (including inside Docker), the
# native libs live on the standard system library path, so this line is
# unnecessary there; if you ever do need to point at a nonstandard path on
# Linux, the equivalent variable is LD_LIBRARY_PATH, not DYLD_FALLBACK_LIBRARY_PATH.
export DYLD_FALLBACK_LIBRARY_PATH="/opt/homebrew/lib"

source .venv/bin/activate
uvicorn app.main:app --reload
