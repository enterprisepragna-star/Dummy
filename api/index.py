import sys
import os
from pathlib import Path

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_path = root_dir / "backend"

if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

try:
    from server import app
except Exception as e:
    import logging
    logging.error(f"Error importing FastAPI server module: {e}")
    raise e

# Vercel entry point
app = app
