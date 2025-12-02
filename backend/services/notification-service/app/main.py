# services/notification-service/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router
from .database import init_db
from .core.config import settings

app = FastAPI(
    title="Notification Service",
    description="Real-time notification management",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def startup_event():
    """Initialize database on startup"""
    init_db()          # Table creation moved here


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "notification"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.NOTIFICATION_SERVICE_PORT)