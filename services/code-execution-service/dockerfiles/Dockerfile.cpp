# ============================================
# C++ Optimized Dockerfile (Multi-stage)
# ============================================
FROM alpine:3.18 AS cpp-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    g++ \
    musl-dev \
    make

# This stage is used for compilation only
# The actual compilation happens at runtime via docker_manager.py

FROM alpine:3.18 AS cpp-executor

# Install only runtime dependencies and optimize
RUN apk add --no-cache \
    libstdc++ \
    libgcc \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/* /var/tmp/* \
    && find /usr -name "*.a" -delete 2>/dev/null || true

WORKDIR /app

# Create non-root user for security
RUN adduser -D -u 1000 coderunner \
    && chown coderunner:coderunner /app

# Switch to non-root user
USER coderunner

# Set resource limits for C++ execution
ENV MALLOC_ARENA_MAX=1

# Default command to execute C++ binary
CMD ["/app/solution"]