"""
Review Service Main Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import routes, models, database
from .database import engine
from .core.config import settings
import uvicorn

# Create FastAPI app
app = FastAPI(
    title="Review Service",
    description="Review and comment service for Steam-like platform",
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

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(routes.router, prefix="/api/v1/reviews", tags=["reviews"])

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "review-service"}

@app.get("/")
def root():
    """Root endpoint"""
    return {"message": "Review Service API", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.REVIEW_SERVICE_PORT,
        reload=True
    )