# AI Analysis Service

A comprehensive AI-powered code analysis service that provides intelligent feedback, security vulnerability detection, performance analysis, and code quality assessment for multiple programming languages.

## Features

- **Multi-language Support**: Python, JavaScript, TypeScript, Java, C++, Go, Rust, C#
- **Comprehensive Analysis**: Security, performance, quality, and complexity analysis
- **AI-Powered Feedback**: LLM integration for intelligent code explanations and suggestions
- **Progressive Hints**: Context-aware hint generation for coding problems
- **Code Explanation**: Detailed explanations of code functionality and algorithms
- **Caching**: Redis-based caching for improved performance
- **Scalable Architecture**: FastAPI with async support and proper error handling

## Architecture

The service is built using:
- **FastAPI**: Modern, fast web framework for building APIs
- **Python 3.11**: Latest Python with async/await support
- **Redis**: Caching and session storage
- **PostgreSQL**: Persistent data storage
- **OpenAI/Anthropic**: AI/LLM integration for intelligent analysis
- **Tree-sitter**: Code parsing and AST analysis
- **Docker**: Containerized deployment

## API Endpoints

### Analysis Endpoints

- `POST /api/v1/analysis/analyze` - Analyze code for quality, security, and performance
- `POST /api/v1/analysis/hints` - Generate progressive hints for coding problems
- `POST /api/v1/analysis/explain` - Generate detailed code explanations
- `POST /api/v1/analysis/batch-analyze` - Batch analysis of multiple code samples
- `GET /api/v1/analysis/languages` - Get supported programming languages
- `GET /api/v1/analysis/analysis-types` - Get available analysis types
- `GET /api/v1/analysis/metrics` - Get service metrics and statistics

### Health Endpoints

- `GET /health/` - Basic health check
- `GET /health/detailed` - Detailed health check with dependencies
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe

## Installation

### Prerequisites

- Python 3.11+
- Redis server
- PostgreSQL database
- OpenAI or Anthropic API key

### Local Development

1. Clone the repository and navigate to the service directory:
```bash
cd services/ai-analysis-service
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy environment configuration:
```bash
cp .env.example .env
```

5. Update the `.env` file with your configuration:
```env
# Database Configuration
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ai_analysis_db
REDIS_URL=redis://localhost:6379/0

# AI Service Configuration
OPENAI_API_KEY=your_openai_api_key_here
AI_MODEL_PROVIDER=openai
AI_MODEL_NAME=gpt-4

# Security Configuration
SECRET_KEY=your_secret_key_here
```

6. Start the service:
```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t ai-analysis-service .
```

2. Run with Docker Compose:
```bash
docker-compose up -d
```

## Usage Examples

### Code Analysis

```python
import httpx

# Analyze Python code
response = httpx.post("http://localhost:8000/api/v1/analysis/analyze", json={
    "code": """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
""",
    "language": "python",
    "analysis_types": ["general"],
    "include_ai_feedback": True
})

result = response.json()
print(f"Quality Score: {result['quality_score']}")
print(f"Security Score: {result['security_score']}")
print(f"Performance Score: {result['performance_score']}")
```

### Generate Hints

```python
# Generate hints for a coding problem
response = httpx.post("http://localhost:8000/api/v1/analysis/hints", json={
    "problem_id": "fibonacci-problem",
    "user_code": "def fibonacci(n): pass",
    "language": "python",
    "hint_level": 2
})

hints = response.json()
for hint in hints:
    print(f"Hint {hint['level']}: {hint['content']}")
```

### Code Explanation

```python
# Get code explanation
response = httpx.post("http://localhost:8000/api/v1/analysis/explain", json={
    "code": "def quicksort(arr): return arr if len(arr) <= 1 else quicksort([x for x in arr[1:] if x < arr[0]]) + [arr[0]] + quicksort([x for x in arr[1:] if x >= arr[0]])",
    "language": "python",
    "detail_level": "detailed"
})

explanation = response.json()
print(f"Summary: {explanation['summary']}")
print(f"Time Complexity: {explanation['time_complexity']}")
print(f"Space Complexity: {explanation['space_complexity']}")
```

## Analysis Types

The service supports several types of analysis:

- **General**: Comprehensive analysis including all aspects
- **Security**: Focus on security vulnerabilities and best practices
- **Performance**: Performance issues and optimization suggestions
- **Quality**: Code quality, maintainability, and best practices
- **Complexity**: Cyclomatic complexity and maintainability metrics

## Security Features

The service includes comprehensive security analysis:

- **Vulnerability Detection**: Common security issues like SQL injection, XSS, code injection
- **Best Practices**: Security best practices and recommendations
- **CWE Mapping**: Issues mapped to Common Weakness Enumeration identifiers
- **Severity Levels**: Critical, High, Medium, Low severity classification
- **Remediation Guidance**: Specific recommendations for fixing issues

## Performance Analysis

Performance analysis includes:

- **Algorithmic Complexity**: Detection of inefficient algorithms
- **Code Patterns**: Identification of performance anti-patterns
- **Resource Usage**: Memory and CPU usage considerations
- **Optimization Suggestions**: Specific recommendations for improvements

## Testing

Run the test suite:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_analysis_service.py -v
```

## Configuration

Key configuration options in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 8000 |
| `DEBUG` | Debug mode | true |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `AI_MODEL_PROVIDER` | AI provider (openai/anthropic) | openai |
| `AI_MODEL_NAME` | AI model name | gpt-4 |
| `MAX_CODE_LENGTH` | Maximum code length | 50000 |
| `ANALYSIS_TIMEOUT` | Analysis timeout (seconds) | 30 |

## Monitoring

The service provides metrics and health checks:

- **Health Endpoints**: Basic and detailed health checks
- **Metrics**: Service statistics and performance metrics
- **Logging**: Structured logging with configurable levels
- **Error Tracking**: Comprehensive error handling and reporting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the test cases for usage examples