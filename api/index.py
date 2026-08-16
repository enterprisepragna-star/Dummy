import sys
from pathlib import Path

# Add backend directory to python path
root_dir = Path(__file__).parent.parent
backend_path = root_dir / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from server import app

# Export app instance for Vercel Serverless
app = app
