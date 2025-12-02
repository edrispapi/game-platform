"""
Game Catalog Service Main Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app import routes  # re-exported router
from app.core.config import settings
from app.db.init_db import init_db
from app.models import *  # noqa: F401  (register models)

# Create FastAPI app
app = FastAPI(
    title="Game Catalog Service",
    description="Game catalog and search service for Steam-like platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure tables exist on startup


# Include routers
app.include_router(routes.router, prefix="/api/v1/catalog", tags=["catalog"])

@app.on_event("startup")
async def on_startup():
    await init_db()


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "game-catalog-service"}


@app.get("/")
async def root():
    return {"message": "Game Catalog Service API", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.GAME_CATALOG_SERVICE_PORT,
        reload=True,
    )