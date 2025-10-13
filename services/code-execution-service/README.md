# Code Execution Service

A secure, scalable code execution service built with FastAPI that supports multiple programming languages with Docker-based sandboxing.

## Features

- **Multi-language Support**: Python, JavaScript, Java, C++, Go, Rust
- **Secure Execution**: Docker-based sandboxing with resource limits
- **Security Validation**: Code analysis to prevent malicious code execution
- **Performance Monitoring**: Comprehensive metrics collection and monitoring
- **Resource Management**: CPU, memory, and time limit enforcement
- **Test Case Execution**: Automated test case validation
- **Real-time Metrics**: Redis-based metrics collection and aggregation

## Architecture

The service follows a modular architecture:

- **API Layer**: FastAPI-based REST API
- **Execution Engine**: Docker container management for code execution
- **Security Layer**: Code validation and sanitization
- **Metrics Collection**: Performance and usage analytics
- **Resource Management**: Container lifecycle and cleanup

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+
- Redis (for metrics)

### Installation

1. Clone the repository and navigate to the service directory:

```bash
cd services/code-execution-service
```

2. Copy environment configuration:

```bash
cp .env.example .env
```

3. Start the service with Docker Compose:

```bash
docker-compose up -d
```

4. The service will be available at `http://localhost:3004`

### Development Setup

1. Install Python dependencies:

```bash
pip install -r requirements.txt
```

2. Start Redis:

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

3. Run the service:

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 3004
```

## API Endpoints

### Execute Code

```http
POST /api/v1/execute
```

Execute code with test cases:

```json
{
  "code": "def add(a, b):\n    return a + b\n\nprint(add(2, 3))",
  "language": "python",
  "test_cases": [
    {
      "input": "",
      "expected_output": "5",
      "is_hidden": false
    }
  ],
  "time_limit": 5,
  "memory_limit": 128,
  "user_id": "optional_user_id"
}
```

### Health Check

```http
GET /api/v1/health
```

### Get Metrics

```http
GET /api/v1/metrics?hours=24
```

### Get User Metrics

```http
GET /api/v1/metrics/user/{user_id}?hours=24
```

### Get Supported Languages

```http
GET /api/v1/languages
```

### Admin Endpoints

Pull Docker images:

```http
POST /api/v1/admin/pull-images
```

Cleanup resources:

```http
POST /api/v1/admin/cleanup
```

## Supported Languages

| Language   | Version | Compilation | File Extension |
| ---------- | ------- | ----------- | -------------- |
| Python     | 3.11    | No          | .py            |
| JavaScript | Node 18 | No          | .js            |
| Java       | 17      | Yes         | .java          |
| C++        | GCC 11  | Yes         | .cpp           |
| Go         | 1.21    | Yes         | .go            |
| Rust       | 1.75    | Yes         | .rs            |

## Security Features

### Code Validation

- Blocked dangerous imports and functions
- Suspicious keyword detection
- Code length and complexity limits
- Input/output validation

### Container Security

- Isolated execution environments
- Resource limits (CPU, memory, time)
- Network disabled
- Read-only filesystem
- Non-root user execution
- Security options and capability dropping

### Resource Limits

- CPU: 0.5 cores maximum
- Memory: 32-512 MB configurable
- Time: 1-30 seconds configurable
- File size: 1MB maximum

## Testing

Run the test suite:

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test categories
pytest -m security  # Security tests
pytest -m integration  # Integration tests
pytest tests/test_performance.py  # Performance tests
```

## Configuration

Environment variables:

| Variable            | Default   | Description               |
| ------------------- | --------- | ------------------------- |
| `DEBUG`             | false     | Enable debug mode         |
| `LOG_LEVEL`         | INFO      | Logging level             |
| `REDIS_HOST`        | localhost | Redis host                |
| `REDIS_PORT`        | 6379      | Redis port                |
| `MAX_CODE_LENGTH`   | 50000     | Maximum code length       |
| `MAX_TEST_CASES`    | 100       | Maximum test cases        |
| `EXECUTION_TIMEOUT` | 30        | Container timeout         |
| `METRICS_ENABLED`   | true      | Enable metrics collection |

## Monitoring

The service provides comprehensive monitoring:

### Metrics

- Execution counts by language
- Success/failure rates
- Execution time histograms
- Memory usage patterns
- User activity tracking

### Health Checks

- Docker daemon connectivity
- Redis connectivity
- Service responsiveness

### Logging

- Structured JSON logging
- Request/response logging
- Error tracking
- Performance metrics

## Performance

### Benchmarks

- Concurrent execution support
- Sub-second response times for simple code
- Efficient resource cleanup
- Scalable metrics collection

### Optimization

- Container reuse where possible
- Efficient Docker image management
- Background cleanup processes
- Redis-based caching

## Security Considerations

### Threat Model

- Malicious code execution prevention
- Resource exhaustion protection
- Container escape prevention
- Data exfiltration protection

### Security Measures

- Input validation and sanitization
- Secure container configuration
- Resource limits enforcement
- Audit logging
- Regular security updates

## Deployment

### Production Deployment

1. Use production-ready Docker images
2. Configure proper resource limits
3. Set up monitoring and alerting
4. Enable security scanning
5. Configure backup and recovery

### Scaling

- Horizontal scaling with load balancers
- Container orchestration with Kubernetes
- Redis clustering for metrics
- Database sharding for analytics

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Follow security best practices
5. Test with all supported languages

## License

This project is part of the AI-powered coding platform and follows the same licensing terms.
