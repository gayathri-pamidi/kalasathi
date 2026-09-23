from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.image_routes import router as image_router
from app.api.catalog_routes import router as catalog_router
from app.api.pricing_routes import router as pricing_router

app = FastAPI(
    title="Artisan AI",
    description="AI backend for marginalized artisans",
    version="1.0.0"
)

# Enable CORS for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Register API Routers
app.include_router(image_router, prefix="/api/v1/image")
app.include_router(catalog_router, prefix="/api/v1/catalog")
app.include_router(pricing_router, prefix="/api/v1/pricing")


@app.get("/artisan")
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "artisan-ai"
    }