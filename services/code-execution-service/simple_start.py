#!/usr/bin/env python3
"""
Simple startup script for Code Execution Service
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
        title="Code Execution Service",
        description="Secure code execution service",
        version="1.0.0"
    )
    
    @app.get("/")
    async def root():
        return {"service": "Code Execution Service", "status": "running", "version": "1.0.0"}
    
    @app.get("/api/v1/health")
    async def health():
        return {"status": "healthy", "service": "code-execution-service"}
    
    @app.post("/api/v1/execute")
    async def execute_code():
        return {"message": "Code execution endpoint (simplified)", "status": "not_implemented"}
    
    if __name__ == "__main__":
        print("Starting Code Execution Service (Simple Mode)...")
        uvicorn.run(
            "simple_start:app",
            host="0.0.0.0",
            port=3004,
            reload=False
        )
        
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Please install: pip install fastapi uvicorn")
    sys.exit(1)