# ============================================
# Java Optimized Dockerfile (Multi-stage)
# ============================================
FROM eclipse-temurin:17-jdk-alpine AS java-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache bash

# This stage is used for compilation only
# The actual compilation happens at runtime via docker_manager.py

FROM eclipse-temurin:17-jre-alpine AS java-executor

# Optimize JRE installation
RUN apk add --no-cache \
    && rm -rf /var/cache/apk/* \
    && rm -rf /opt/java/openjdk/lib/src.zip \
    && rm -rf /opt/java/openjdk/man \
    && find /opt/java/openjdk -name "*.diz" -delete

WORKDIR /app

# Create non-root user for security
RUN adduser -D -u 1000 coderunner \
    && chown coderunner:coderunner /app

# Optimized JVM settings for container execution with better memory management
ENV JAVA_OPTS="-Xmx96m -Xms16m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+UseContainerSupport -XX:MaxRAMPercentage=75 -XX:+UnlockExperimentalVMOptions -XX:+UseStringDeduplication -Djava.security.egd=file:/dev/./urandom"

# Switch to non-root user
USER coderunner

# Set explicit entrypoint to avoid conflicts
ENTRYPOINT []

# Default command to execute Java code
CMD ["sh", "-c", "java $JAVA_OPTS -cp /app Solution"]