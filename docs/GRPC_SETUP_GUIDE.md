# gRPC Setup Guide - Step by Step Implementation

This guide provides a step-by-step approach to implementing gRPC in your AI-powered coding platform without breaking existing functionality.

## Current Status

✅ **Phase 1 Complete**: Protocol buffer definitions and basic infrastructure
- All `.proto` files created with comprehensive service definitions
- gRPC common package structure established
- Basic types and utilities implemented

## Next Steps - Phase 2: Generate Protobuf Files

### Step 1: Install Required Dependencies

First, install the protobuf compilation tools:

```bash
# Install protobuf compiler globally (if not already installed)
# On Windows with Chocolatey:
choco install protoc

# On macOS with Homebrew:
brew install protobuf

# On Ubuntu/Debian:
sudo apt-get install protobuf-compiler

# Install Node.js gRPC tools
npm install -g grpc-tools
```

### Step 2: Install Package Dependencies

```bash
# Install dependencies for the gRPC common package
cd packages/grpc-common
npm install

# Install protobuf generation tools
npm install grpc-tools grpc_tools_node_protoc_ts --save-dev
```

### Step 3: Generate Protobuf Files

```bash
# From the project root
npm run proto:build
```

This will:
1. Clean existing generated files
2. Generate JavaScript files from `.proto` definitions
3. Generate TypeScript definitions
4. Place all files in `packages/grpc-common/src/generated/`

### Step 4: Update gRPC Common Package

After successful protobuf generation, update `packages/grpc-common/src/index.ts`:

```typescript
// Uncomment these lines after protobuf generation
export * from './generated/common_pb';
export * from './generated/user_pb';
export * from './generated/problem_pb';
export * from './generated/execution_pb';
export * from './generated/contest_pb';
export * from './generated/analytics_pb';
export * from './generated/notification_pb';
export * from './generated/ai-analysis_pb';

export * from './generated/user_grpc_pb';
export * from './generated/problem_grpc_pb';
export * from './generated/execution_grpc_pb';
export * from './generated/contest_grpc_pb';
export * from './generated/analytics_grpc_pb';
export * from './generated/notification_grpc_pb';
export * from './generated/ai-analysis_grpc_pb';
```

### Step 5: Add gRPC Dependencies to Services

Update package.json files for services that will use gRPC:

```json
{
  "dependencies": {
    "@ai-platform/grpc-common": "^1.0.0",
    "@grpc/grpc-js": "^1.9.0",
    "@grpc/proto-loader": "^0.7.8"
  }
}
```

### Step 6: Enable gRPC Servers

After protobuf generation, uncomment the gRPC server code in:

1. **User Service** (`services/user-service/src/index.ts`):
```typescript
// Uncomment these lines
import { UserGrpcService } from './grpc/user-service';

// In startServer function:
const grpcService = new UserGrpcService();
await grpcService.start();
```

2. **Problem Service** (`services/problem-service/src/index.ts`):
```typescript
// Uncomment these lines
import { ProblemGrpcService } from './grpc/problem-service';

// In startServer function:
const grpcService = new ProblemGrpcService();
await grpcService.start();
```

### Step 7: Enable API Gateway gRPC Integration

Update `services/api-gateway/src/index.ts`:

```typescript
// Uncomment these lines
import { initializeGrpcClients, cleanupGrpcClients } from './grpc/clients';

// In startServer function:
initializeGrpcClients();
logger.info('gRPC clients initialized');
```

Update `services/api-gateway/src/routes/index.ts`:

```typescript
// Uncomment these lines
import { grpcRoutes } from './grpc-routes';

// Add gRPC routes:
app.use('/api/v2', grpcRoutes);
```

## Phase 3: Testing and Validation

### Step 1: Start Services

```bash
# Start all services
npm run dev

# Or start individual services
npm run dev --workspace=services/user-service
npm run dev --workspace=services/problem-service
npm run dev --workspace=services/api-gateway
```

### Step 2: Test gRPC Endpoints

```bash
# Test gRPC health check
curl http://localhost:8080/api/v2/health/grpc

# Test user creation via gRPC
curl -X POST http://localhost:8080/api/v2/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "acceptTerms": true
  }'

# Test problem search via gRPC
curl "http://localhost:8080/api/v2/problems/search?q=array&limit=10"
```

### Step 3: Performance Testing

```bash
# Install Apache Bench for load testing
# Test HTTP vs gRPC performance
ab -n 1000 -c 10 http://localhost:8080/api/users/check-email?email=test@example.com
ab -n 1000 -c 10 http://localhost:8080/api/v2/users/check-email?email=test@example.com
```

## Phase 4: Advanced Features

### Step 1: Implement Streaming

Add streaming endpoints for real-time features:

1. **Contest Leaderboard Streaming**
2. **Code Execution Progress**
3. **Real-time Notifications**

### Step 2: Add Service Discovery

Implement automatic service discovery and load balancing:

1. **Service Registry Integration**
2. **Health Check Automation**
3. **Circuit Breaker Patterns**

### Step 3: Monitoring and Observability

Add comprehensive monitoring:

1. **gRPC Metrics Collection**
2. **Distributed Tracing**
3. **Performance Dashboards**

## Troubleshooting

### Common Issues

1. **Protobuf Generation Fails**
   ```bash
   # Check if protoc is installed
   protoc --version
   
   # Install missing dependencies
   npm install grpc-tools grpc_tools_node_protoc_ts
   ```

2. **Import Errors After Generation**
   ```bash
   # Rebuild the gRPC common package
   cd packages/grpc-common
   npm run build
   ```

3. **gRPC Server Won't Start**
   ```bash
   # Check port availability
   netstat -an | grep :50051
   
   # Check firewall settings
   # Ensure ports 50051-50058 are open
   ```

4. **Client Connection Issues**
   ```bash
   # Test direct gRPC connection
   grpcurl -plaintext localhost:50051 list
   ```

### Debug Commands

```bash
# Check service health
curl http://localhost:8080/api/v1/health

# Check gRPC service health
curl http://localhost:8080/api/v2/health/grpc

# View generated protobuf files
ls -la packages/grpc-common/src/generated/

# Check service logs
docker-compose logs -f user-service
docker-compose logs -f problem-service
docker-compose logs -f api-gateway
```

## Migration Checklist

- [ ] Install protobuf compiler
- [ ] Install Node.js gRPC tools
- [ ] Generate protobuf files
- [ ] Update gRPC common package exports
- [ ] Add gRPC dependencies to services
- [ ] Enable gRPC servers in services
- [ ] Enable gRPC clients in API Gateway
- [ ] Test basic gRPC functionality
- [ ] Performance test HTTP vs gRPC
- [ ] Implement streaming features
- [ ] Add monitoring and observability
- [ ] Deploy to production

## Expected Benefits After Full Implementation

- **40-60% reduction** in internal service call latency
- **2-3x improvement** in requests per second
- **20-30% reduction** in memory usage
- **15-25% reduction** in network payload size
- **Real-time streaming** capabilities
- **Type-safe** service communication
- **Automatic retry** and circuit breaker patterns

This phased approach ensures that your existing HTTP API continues to work while you gradually implement and test the gRPC functionality.