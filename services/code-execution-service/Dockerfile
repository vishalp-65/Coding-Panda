# ============================================
# Optimized Code Execution Service Dockerfile
# ============================================
FROM python:3.11-alpine

# Install Docker CLI and runtime dependencies
RUN apk add --no-cache \
    docker-cli \
    curl \
    tini \
    gcc \
    musl-dev \
    libffi-dev \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/* /var/tmp/*

WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip cache purge

# Copy application code
COPY src/ ./src/
COPY *.py ./

# Set Python optimizations
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONOPTIMIZE=2 \
    PYTHONHASHSEED=random

# Note: Running as root for Docker socket access in development
# In production, use proper Docker socket permissions

EXPOSE 3004

# Health check with faster timeout
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3004/api/v1/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3004", "--workers", "1"]