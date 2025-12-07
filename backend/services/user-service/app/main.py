# services/user-service/app/main.py
"""
User Service Main Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app import routes
from app.core.config import settings
from app.db.init_db import init_db

# Create FastAPI app
app = FastAPI(
    title="User Service",
    description="User management service for Steam-like platform",
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

# Include routers
app.include_router(routes.router, prefix="/api/v1/users", tags=["users"])


@app.on_event("startup")
async def startup_event():
    """Initialize database tables on app startup"""
    await init_db()


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "user-service"}


@app.get("/")
def root():
    """Root endpoint"""
    return {"message": "User Service API", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.USER_SERVICE_PORT,
        reload=True
    )