# ============================================
# Go Optimized Dockerfile (Multi-stage)
# ============================================
FROM golang:1.21-alpine AS go-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    git \
    ca-certificates

# This stage is used for compilation only
# The actual compilation happens at runtime via docker_manager.py

FROM alpine:3.18 AS go-executor

# Install minimal runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user for security
RUN adduser -D -u 1000 coderunner \
    && chown coderunner:coderunner /app

# Switch to non-root user
USER coderunner

# Default command to execute Go binary
CMD ["/app/solution"]