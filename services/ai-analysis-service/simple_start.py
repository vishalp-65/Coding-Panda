#!/usr/bin/env python3
"""
Simple startup script for AI Analysis Service
Bypasses complex dependencies for basic testing
"""

import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

try:
    from fastapi import FastAPI
    import uvicorn
    
    # Create a simple FastAPI app for testing
    app = FastAPI(
        title="AI Analysis Service",
        description="AI-powered code analysis service",
        version="1.0.0"
    )
    
    @app.get("/")
    async def root():
        return {"service": "AI Analysis Service", "status": "running", "version": "1.0.0"}
    
    @app.get("/api/v1/health")
    async def health():
        return {"status": "healthy", "service": "ai-analysis-service"}
    
    @app.get("/metrics")
    async def metrics():
        return {
            "success": True,
            "data": {
                "service": "AI Analysis Service",
                "status": "healthy",
                "uptime": "running"
            }
        }
    
    if __name__ == "__main__":
        print("Starting AI Analysis Service (Simple Mode)...")
        uvicorn.run(
            "simple_start:app",
            host="0.0.0.0",
            port=8001,
            reload=False
        )
        
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Please install: pip install fastapi uvicorn")
    sys.exit(1)