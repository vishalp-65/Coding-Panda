# AI-Powered Coding Platform

A comprehensive microservices-based coding contest platform with AI-powered features for learning, practice, and interview preparation.

## Architecture

This project follows a microservices architecture with the following services:

- **API Gateway**: Request routing, authentication, and rate limiting
- **User Service**: User management, authentication, and profiles
- **Problem Service**: Coding problems, test cases, and editorial content
- **Code Execution Service**: Secure code execution in isolated containers
- **AI Analysis Service**: Code analysis, hints, and learning recommendations
- **Contest Service**: Contest management and real-time rankings
- **Real-time Service**: WebSocket connections and live updates
- **Notification Service**: Email and in-app notifications

## Development Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm 9+

### Quick Start

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development environment:
   ```bash
   npm run dev
   ```

This will start all required services using Docker Compose and run the development servers.

### Available Scripts

- `npm run dev` - Start development environment
- `npm run build` - Build all services
- `npm run test` - Run tests for all services
- `npm run lint` - Lint all code
- `npm run format` - Format code with Prettier
- `npm run docker:up` - Start Docker services only
- `npm run docker:down` - Stop Docker services

## Project Structure

```
├── services/           # Microservices
│   ├── api-gateway/   # API Gateway service
│   ├── user-service/  # User management service
│   └── ...
├── packages/          # Shared packages
│   ├── common/        # Common utilities and types
│   └── ...
├── apps/              # Frontend applications
│   └── web/           # React web application
├── docker-compose.yml # Development environment
└── package.json       # Workspace configuration
```

## Contributing

1. Follow the established code style (ESLint + Prettier)
2. Write tests for new features
3. Update documentation as needed
4. Use conventional commit messages