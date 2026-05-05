import os
import time
from pathlib import Path
from app.core.config import settings
from app.services.pipeline import process_inbox_folder

PROCESSED_MARKER = ".processed"


def run_inbox_worker(stop_flag):
    inbox = Path(settings.inbox_dir)
    inbox.mkdir(parents=True, exist_ok=True)

    while not stop_flag["stop"]:
        for item in inbox.iterdir():
            if not item.is_dir():
                continue
            marker = item / PROCESSED_MARKER
            if marker.exists():
                continue
            try:
                process_inbox_folder(str(item))
                marker.write_text("ok")
            except Exception as e:
                (item / ".error").write_text(str(e))
                marker.write_text("failed")
        time.sleep(settings.poll_interval_sec)
