from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from backend.routes import upload, chat, documents
from backend.config import get_api_config_status

app = FastAPI(title="RAG Synapse")

# Serve static files from frontend public directory
frontend_public_path = Path(__file__).parent.parent / "frontend" / "public"
if frontend_public_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_public_path)), name="static")
    
    # Serve logo files directly (for proxy requests from React dev server)
    @app.get("/logo2.png")
    async def get_logo2():
        logo_path = frontend_public_path / "logo2.png"
        if logo_path.exists():
            return FileResponse(str(logo_path), media_type="image/png")
        raise HTTPException(status_code=404, detail="Logo not found")
    
    @app.get("/logo1.png")
    async def get_logo1():
        logo_path = frontend_public_path / "logo1.png"
        if logo_path.exists():
            return FileResponse(str(logo_path), media_type="image/png")
        raise HTTPException(status_code=404, detail="Logo not found")
    
    @app.get("/image.png")
    async def get_image():
        logo_path = frontend_public_path / "image.png"
        if logo_path.exists():
            return FileResponse(str(logo_path), media_type="image/png")
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Handle old image path name (redirect to new logo)
    # FastAPI will automatically decode URL-encoded paths
    @app.get("/image copy 2.png")
    async def get_old_logo():
        logo_path = frontend_public_path / "logo2.png"
        if logo_path.exists():
            return FileResponse(str(logo_path), media_type="image/png")
        raise HTTPException(status_code=404, detail="Logo not found")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    print(f"Unhandled error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please try again later.",
            "error": str(exc) if app.debug else None
        }
    )

# Validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error. Please check your request.",
            "errors": exc.errors()
        }
    )

# Track router registration status
router_status = {
    "upload": {"registered": False, "error": None},
    "chat": {"registered": False, "error": None},
    "documents": {"registered": False, "error": None}
}

# Include routers with /api prefix
print("\n" + "="*50)
print("Registering API routes...")
print("="*50)

try:
    app.include_router(upload.router, prefix="/api", tags=["upload"])
    router_status["upload"]["registered"] = True
    print("✓ Upload router registered at /api/upload")
except Exception as e:
    router_status["upload"]["error"] = str(e)
    print(f"✗ Error registering upload router: {e}")
    import traceback
    traceback.print_exc()

try:
    app.include_router(chat.router, prefix="/api", tags=["chat"])
    router_status["chat"]["registered"] = True
    print("✓ Chat router registered at /api/chat")
except Exception as e:
    router_status["chat"]["error"] = str(e)
    print(f"✗ Error registering chat router: {e}")
    import traceback
    traceback.print_exc()

try:
    app.include_router(documents.router, prefix="/api", tags=["documents"])
    router_status["documents"]["registered"] = True
    print("✓ Documents router registered at /api/documents")
except Exception as e:
    router_status["documents"]["error"] = str(e)
    print(f"✗ Error registering documents router: {e}")
    import traceback
    traceback.print_exc()

print("="*50)
print(f"Total routes registered: {len([r for r in app.routes if hasattr(r, 'path')])}")
print("="*50 + "\n")


@app.get("/")
async def root():
    return {"message": "RAG Synapse API", "status": "running"}


@app.get("/debug/routes")
async def debug_routes():
    """Debug endpoint to list all registered routes and API configuration status."""
    routes = []
    for route in app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            routes.append({
                "path": route.path,
                "methods": list(route.methods) if route.methods else [],
                "name": getattr(route, "name", "N/A")
            })
    
    # Get API configuration status
    api_config = get_api_config_status()
    
    return {
        "routes": routes,
        "total_routes": len(routes),
        "router_registration": router_status,
        "api_config": api_config,
        "api_endpoints": {
            "/api/chat": "POST - Chat with documents",
            "/api/upload": "POST - Upload documents",
            "/api/documents": "GET - List documents, DELETE - Delete document",
            "/api/health": "GET - Health check for all services"
        }
    }


@app.get("/api/status")
async def api_status():
    """Get API configuration and service status."""
    return {
        "config": get_api_config_status(),
        "routers": router_status
    }
