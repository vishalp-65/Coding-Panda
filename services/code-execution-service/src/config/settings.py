from pydantic_settings import BaseSettings
from typing import Dict, Any
import os


class Settings(BaseSettings):
    # Application settings
    app_name: str = "Code Execution Service"
    debug: bool = False
    
    # Docker settings
    docker_socket: str = "unix://var/run/docker.sock"
    execution_timeout: int = 30
    container_memory_limit: str = "128m"
    container_cpu_limit: str = "0.5"
    
    # Security settings
    max_code_length: int = 50000
    max_test_cases: int = 100
    allowed_file_extensions: list = [".py", ".js", ".java", ".cpp", ".go", ".rs"]
    blocked_imports: Dict[str, list] = {
        "python": ["os", "sys", "subprocess", "socket", "urllib", "requests"],
        "javascript": ["fs", "child_process", "net", "http", "https"],
        "java": ["java.io", "java.net", "java.lang.Runtime"],
        "cpp": ["system", "exec", "popen"],
        "go": ["os/exec", "net", "syscall"],
        "rust": ["std::process", "std::net", "std::fs"]
    }
    
    # Redis settings
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str = ""
    
    # Monitoring settings
    metrics_enabled: bool = True
    log_level: str = "INFO"
    
    # Language-specific settings
    language_configs: Dict[str, Dict[str, Any]] = {
        "python": {
            "image": "python:3.11-alpine",
            "compile_command": None,
            "run_command": "python /app/solution.py",
            "file_extension": ".py"
        },
        "javascript": {
            "image": "node:18-alpine",
            "compile_command": None,
            "run_command": "node /app/solution.js",
            "file_extension": ".js"
        },
        "java": {
            "image": "openjdk:17-alpine",
            "compile_command": "javac -d /app /app/Solution.java",
            "run_command": "java -cp /app Solution",
            "file_extension": ".java",
            "class_name": "Solution"
        },
        "cpp": {
            "image": "gcc:11-alpine",
            "compile_command": "g++ -o /app/solution /app/solution.cpp -std=c++17",
            "run_command": "/app/solution",
            "file_extension": ".cpp"
        },
        "go": {
            "image": "golang:1.21-alpine",
            "compile_command": "go build -o /app/solution /app/solution.go",
            "run_command": "/app/solution",
            "file_extension": ".go"
        },
        "rust": {
            "image": "rust:1.75-alpine",
            "compile_command": "rustc -o /app/solution /app/solution.rs",
            "run_command": "/app/solution",
            "file_extension": ".rs"
        }
    }

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()