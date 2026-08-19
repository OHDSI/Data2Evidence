import os
import sys

# tasks.py imports _shared_flow_utils, which lives at plugins/flows/ — one level
# above this plugin's project root. The pixi activation env pins PYTHONPATH to
# the plugin dir only, so add the parent explicitly.
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
)
