import sys
from pathlib import Path

# plugins/flows holds _shared_flow_utils, which the plugin modules import
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
