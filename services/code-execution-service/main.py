# Main entry point for Code Execution Service
# This file allows running the service from the root directory

import sys
import os

# Add src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Import and expose the app from src.main
from src.main import app

# This allows uvicorn to find the app when running: uvicorn main:app
__all__ = ['app']