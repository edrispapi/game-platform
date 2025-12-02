"""
API Gateway Service
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import redis
import os

# Service URLs
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:8001")
GAME_CATALOG_SERVICE_URL = os.getenv("GAME_CATALOG_SERVICE_URL", "http://localhost:8002")
REVIEW_SERVICE_URL = os.getenv("REVIEW_SERVICE_URL", "http://localhost:8003")
SHOPPING_SERVICE_URL = os.getenv("SHOPPING_SERVICE_URL", "http://localhost:8004")
PURCHASE_SERVICE_URL = os.getenv("PURCHASE_SERVICE_URL", "http://localhost:8005")
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://localhost:8006")
ONLINE_SERVICE_URL = os.getenv("ONLINE_SERVICE_URL", "http://localhost:8007")
SOCIAL_SERVICE_URL = os.getenv("SOCIAL_SERVICE_URL", "http://localhost:8008")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8009")
RECOMMENDATION_SERVICE_URL = os.getenv("RECOMMENDATION_SERVICE_URL", "http://localhost:8010")
ACHIEVEMENT_SERVICE_URL = os.getenv("ACHIEVEMENT_SERVICE_URL", "http://localhost:8011")
FRIENDS_CHAT_SERVICE_URL = os.getenv("FRIENDS_CHAT_SERVICE_URL", "http://localhost:8013")

# Redis connection
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# Create FastAPI app
app = FastAPI(
    title="Steam Clone API Gateway",
    description="API Gateway for Steam-like platform microservices",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service routing configuration
SERVICE_ROUTES = {
    "/api/v1/users": USER_SERVICE_URL,
    "/api/v1/catalog": GAME_CATALOG_SERVICE_URL,
    "/api/v1/reviews": REVIEW_SERVICE_URL,
    "/api/v1/shopping": SHOPPING_SERVICE_URL,
    "/api/v1/purchases": PURCHASE_SERVICE_URL,
    "/api/v1/payments": PAYMENT_SERVICE_URL,
    "/api/v1/online": ONLINE_SERVICE_URL,
    "/api/v1/social": SOCIAL_SERVICE_URL,
    "/api/v1/notifications": NOTIFICATION_SERVICE_URL,
    "/api/v1/recommendations": RECOMMENDATION_SERVICE_URL,
    "/api/v1/achievements": ACHIEVEMENT_SERVICE_URL,
    "/api/v1/friends": FRIENDS_CHAT_SERVICE_URL,
    "/api/v1/workshop": os.getenv("WORKSHOP_SERVICE_URL", "http://localhost:8014"),
}

# Rate limiting configuration
RATE_LIMIT_PER_MINUTE = 60

def get_rate_limit_key(request: Request) -> str:
    """Get rate limiting key based on client IP"""
    client_ip = request.client.host if request.client else "unknown"
    return f"rate_limit:{client_ip}"

def check_rate_limit(request: Request) -> bool:
    """Check if request is within rate limit"""
    key = get_rate_limit_key(request)
    current_count = redis_client.get(key)
    
    if current_count is None:
        redis_client.setex(key, 60, 1)
        return True
    
    if int(current_count) >= RATE_LIMIT_PER_MINUTE:
        return False
    
    redis_client.incr(key)
    return True

async def proxy_request(request: Request, service_url: str) -> JSONResponse:
    """Proxy request to appropriate service"""
    # Check rate limit
    if not check_rate_limit(request):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    # Prepare request
    url = f"{service_url}{request.url.path}"
    params = dict(request.query_params)
    headers = dict(request.headers)
    
    # Remove host header to avoid conflicts
    headers.pop("host", None)
    
    # Make request
    async with httpx.AsyncClient() as client:
        try:
            response = await client.request(
                method=request.method,
                url=url,
                params=params,
                headers=headers,
                content=await request.body(),
                timeout=30.0
            )
            
            # Determine content type
            content_type = response.headers.get("content-type", "")
            is_json = content_type.startswith("application/json")
            
            # Parse response content
            if is_json:
                try:
                    content = response.json()
                except Exception:
                    # Fallback to text if JSON parsing fails
                    content = response.text
            else:
                content = response.text
            
            return JSONResponse(
                content=content,
                status_code=response.status_code,
                headers=dict(response.headers)
            )
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "api-gateway"}

@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Steam Clone API Gateway",
        "version": "1.0.0",
        "services": list(SERVICE_ROUTES.keys())
    }

# Dynamic route handling for all service endpoints
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_all_requests(request: Request, path: str):
    """Proxy all requests to appropriate services"""
    # Normalize path to include leading slash for comparison
    normalized_path = f"/{path}" if not path.startswith("/") else path
    
    # Find matching service
    service_url = None
    for route_prefix, url in SERVICE_ROUTES.items():
        if normalized_path.startswith(route_prefix):
            service_url = url
            break
    
    if not service_url:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return await proxy_request(request, service_url)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )