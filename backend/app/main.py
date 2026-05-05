import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.db.postgres import init_db
from app.services.inbox_worker import run_inbox_worker

app = FastAPI(title=settings.app_name)
app.include_router(router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

worker_stop = {"stop": False}
worker_thread = None

@app.on_event("startup")
def startup_event():
    global worker_thread
    init_db()
    worker_thread = threading.Thread(target=run_inbox_worker, args=(worker_stop,), daemon=True)
    worker_thread.start()

@app.on_event("shutdown")
def shutdown_event():
    worker_stop["stop"] = True

