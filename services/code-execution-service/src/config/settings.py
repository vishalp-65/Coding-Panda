import os
from typing import Dict, Any


class Settings:
    """Configuration settings for the code execution service."""
    
    def __init__(self):
        # Docker configuration
        self.docker_timeout = int(os.getenv('DOCKER_TIMEOUT', '30'))
        self.max_concurrent_executions = int(os.getenv('MAX_CONCURRENT_EXECUTIONS', '10'))
        
        # Security settings
        self.max_code_length = int(os.getenv('MAX_CODE_LENGTH', '50000'))
        self.max_input_length = int(os.getenv('MAX_INPUT_LENGTH', '10000'))
        self.max_output_length = int(os.getenv('MAX_OUTPUT_LENGTH', '10000'))
        
        # Resource limits
        self.default_memory_limit = os.getenv('DEFAULT_MEMORY_LIMIT', '128m')
        self.default_time_limit = int(os.getenv('DEFAULT_TIME_LIMIT', '5'))
        self.default_cpu_limit = os.getenv('DEFAULT_CPU_LIMIT', '0.5')
        
        # Language configurations with Docker images and commands
        self.language_configs: Dict[str, Dict[str, Any]] = {
                "python": {
                "image": "code-exec/python:optimized",  # ~50MB optimized
                "compile_command": None,
                "run_command": "python3 -u /app/solution.py",  # -u for unbuffered
                "file_extension": ".py"
            },
            "javascript": {
                "image": "code-exec/node:optimized",  # ~180MB optimized
                "compile_command": None,
                "run_command": "node /app/solution.js",
                "file_extension": ".js"
            },
            "java": {
                # Optimized multi-stage: JDK builder for compilation, JRE executor (~170MB)
                "image": "code-exec/java:optimized",
                "builder_image": "code-exec/java-builder:optimized",
                "compile_command": "javac -d /app /app/Solution.java",
                "run_command": "java -Xmx96m -Xms32m -XX:+UseSerialGC -XX:MaxRAMPercentage=75 -XX:+UseContainerSupport -XX:TieredStopAtLevel=1 -cp /app Solution",
                "file_extension": ".java",
                "class_name": "Solution"
            },
            "cpp": {
                # Optimized multi-stage: GCC builder, minimal Alpine executor (~15MB)
                "image": "code-exec/cpp:optimized",
                "builder_image": "code-exec/cpp-builder:optimized",
                "compile_command": "g++ -O2 -o /app/solution /app/solution.cpp -std=c++17 -static",
                "run_command": "/app/solution",
                "file_extension": ".cpp"
            },
            "go": {
                # Optimized multi-stage: Go builder, scratch executor (~10MB)
                "image": "code-exec/go:optimized",
                "builder_image": "code-exec/go-builder:optimized",
                "compile_command": "go build -ldflags='-s -w' -o /app/solution /app/solution.go",
                "run_command": "/app/solution",
                "file_extension": ".go"
            },
            "rust": {
                # Optimized multi-stage: Rust builder, minimal Alpine executor (~20MB)
                "image": "code-exec/rust:optimized",
                "builder_image": "code-exec/rust-builder:optimized",
                "compile_command": "rustc --edition 2021 -C opt-level=2 -o /app/solution /app/solution.rs",
                "run_command": "/app/solution",
                "file_extension": ".rs"
            }
        # Add more languages as needed
        }
        
        # Metrics configuration
        self.metrics_enabled = os.getenv('METRICS_ENABLED', 'true').lower() == 'true'
        self.metrics_flush_interval = int(os.getenv('METRICS_FLUSH_INTERVAL', '60'))
        
        # Cache configuration
        self.cache_enabled = os.getenv('CACHE_ENABLED', 'true').lower() == 'true'
        self.cache_ttl = int(os.getenv('CACHE_TTL', '300'))  # 5 minutes
        self.cache_max_size = int(os.getenv('CACHE_MAX_SIZE', '1000'))
        
        # Database configuration (if using persistent storage)
        self.database_url = os.getenv('DATABASE_URL', 'sqlite:///executions.db')
        
        # Logging configuration
        self.log_level = os.getenv('LOG_LEVEL', 'INFO')
        self.log_format = os.getenv('LOG_FORMAT', 
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        
        # API configuration
        self.api_host = os.getenv('API_HOST', '0.0.0.0')
        self.api_port = int(os.getenv('API_PORT', '8000'))
        self.api_workers = int(os.getenv('API_WORKERS', '4'))
        
        # Health check configuration
        self.health_check_interval = int(os.getenv('HEALTH_CHECK_INTERVAL', '30'))
        
        # Cleanup configuration
        self.cleanup_interval = int(os.getenv('CLEANUP_INTERVAL', '300'))  # 5 minutes
        self.container_max_age = int(os.getenv('CONTAINER_MAX_AGE', '3600'))  # 1 hour
    
    def get_language_config(self, language: str) -> Dict[str, Any]:
        """Get configuration for a specific language."""
        return self.language_configs.get(language, {})
    
    def is_language_supported(self, language: str) -> bool:
        """Check if a language is supported."""
        return language in self.language_configs
    
    def get_resource_limits(self, language: str = None) -> Dict[str, Any]:
        """Get resource limits, optionally customized by language."""
        base_limits = {
            'memory_limit': self.default_memory_limit,
            'time_limit': self.default_time_limit,
            'cpu_limit': self.default_cpu_limit,
        }
        
        # Language-specific adjustments
        if language == 'java':
            # Java needs more memory for JVM
            base_limits['memory_limit'] = '256m'
        elif language == 'rust':
            # Rust compilation needs more memory
            base_limits['memory_limit'] = '192m'
        elif language in ['cpp', 'go']:
            # Compiled languages get slightly more memory
            base_limits['memory_limit'] = '160m'
        
        return base_limits
    
    def validate_settings(self) -> bool:
        """Validate configuration settings."""
        try:
            # Check required settings
            if self.max_concurrent_executions <= 0:
                raise ValueError("MAX_CONCURRENT_EXECUTIONS must be positive")
            
            if self.default_time_limit <= 0:
                raise ValueError("DEFAULT_TIME_LIMIT must be positive")
            
            # Validate language configurations
            for lang, config in self.language_configs.items():
                required_keys = ['image', 'file_extension', 'run_command']
                for key in required_keys:
                    if key not in config:
                        raise ValueError(f"Missing {key} in {lang} configuration")
            
            return True
            
        except Exception as e:
            print(f"Settings validation failed: {e}")
            return False


# Global settings instance
settings = Settings()

# Validate settings on import
if not settings.validate_settings():
    raise RuntimeError("Invalid configuration settings")