#!/bin/bash

set -e

# Blue-Green Deployment Script for AI Coding Platform
# This script implements a blue-green deployment strategy with health checks and rollback capability

NAMESPACE="ai-coding-platform"
SERVICES=("api-gateway" "user-service" "problem-service" "code-execution-service" "ai-analysis-service")
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_ON_FAILURE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to get current active environment (blue or green)
get_active_environment() {
    local service=$1
    local current_selector=$(kubectl get service "${service}-service" -n $NAMESPACE -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")
    
    if [[ "$current_selector" == "blue" ]]; then
        echo "blue"
    elif [[ "$current_selector" == "green" ]]; then
        echo "green"
    else
        echo "blue"  # Default to blue if no version selector exists
    fi
}

# Function to get inactive environment
get_inactive_environment() {
    local active=$1
    if [[ "$active" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Function to deploy to inactive environment
deploy_to_inactive() {
    local service=$1
    local active_env=$2
    local inactive_env=$3
    local image_tag=${4:-latest}
    
    log "Deploying $service to $inactive_env environment..."
    
    # Create deployment for inactive environment
    kubectl patch deployment "$service" -n $NAMESPACE --type='merge' -p="{
        \"metadata\": {
            \"labels\": {
                \"version\": \"$inactive_env\"
            }
        },
        \"spec\": {
            \"selector\": {
                \"matchLabels\": {
                    \"app\": \"$service\",
                    \"version\": \"$inactive_env\"
                }
            },
            \"template\": {
                \"metadata\": {
                    \"labels\": {
                        \"app\": \"$service\",
                        \"version\": \"$inactive_env\"
                    }
                },
                \"spec\": {
                    \"containers\": [{
                        \"name\": \"$service\",
                        \"image\": \"ghcr.io/ai-coding-platform/$service:$image_tag\"
                    }]
                }
            }
        }
    }"
    
    # Wait for deployment to be ready
    log "Waiting for $service deployment to be ready..."
    kubectl wait --for=condition=available --timeout=${HEALTH_CHECK_TIMEOUT}s deployment/$service -n $NAMESPACE
    
    success "$service deployed to $inactive_env environment"
}

# Function to run health checks
run_health_checks() {
    local service=$1
    local environment=$2
    local max_attempts=10
    local attempt=1
    
    log "Running health checks for $service in $environment environment..."
    
    # Get pod IP for direct health check
    local pod_name=$(kubectl get pods -n $NAMESPACE -l app=$service,version=$environment -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [[ -z "$pod_name" ]]; then
        error "No pods found for $service in $environment environment"
        return 1
    fi
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts for $service..."
        
        # Check if pod is ready
        local ready=$(kubectl get pod $pod_name -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)
        
        if [[ "$ready" == "True" ]]; then
            # Additional application-specific health check
            local health_status=$(kubectl exec $pod_name -n $NAMESPACE -- curl -s -o /dev/null -w "%{http_code}" http://localhost:$(get_service_port $service)/health 2>/dev/null || echo "000")
            
            if [[ "$health_status" == "200" ]]; then
                success "Health check passed for $service in $environment environment"
                return 0
            fi
        fi
        
        log "Health check failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Health checks failed for $service in $environment environment"
    return 1
}

# Function to get service port
get_service_port() {
    local service=$1
    case $service in
        "api-gateway") echo "3000" ;;
        "user-service") echo "3001" ;;
        "problem-service") echo "3002" ;;
        "code-execution-service") echo "8000" ;;
        "ai-analysis-service") echo "8001" ;;
        *) echo "3000" ;;
    esac
}

# Function to switch traffic
switch_traffic() {
    local service=$1
    local new_environment=$2
    
    log "Switching traffic for $service to $new_environment environment..."
    
    kubectl patch service "${service}-service" -n $NAMESPACE --type='merge' -p="{
        \"spec\": {
            \"selector\": {
                \"app\": \"$service\",
                \"version\": \"$new_environment\"
            }
        }
    }"
    
    success "Traffic switched for $service to $new_environment environment"
}

# Function to run smoke tests
run_smoke_tests() {
    local base_url="https://api.coding-platform.com"
    
    log "Running smoke tests..."
    
    # Test API Gateway health
    local api_health=$(curl -s -o /dev/null -w "%{http_code}" "$base_url/health" || echo "000")
    if [[ "$api_health" != "200" ]]; then
        error "API Gateway health check failed"
        return 1
    fi
    
    # Test user service
    local user_health=$(curl -s -o /dev/null -w "%{http_code}" "$base_url/api/v1/users/health" || echo "000")
    if [[ "$user_health" != "200" ]]; then
        error "User service health check failed"
        return 1
    fi
    
    # Test problem service
    local problem_health=$(curl -s -o /dev/null -w "%{http_code}" "$base_url/api/v1/problems/health" || echo "000")
    if [[ "$problem_health" != "200" ]]; then
        error "Problem service health check failed"
        return 1
    fi
    
    success "All smoke tests passed"
    return 0
}

# Function to rollback deployment
rollback_deployment() {
    local service=$1
    local rollback_env=$2
    
    warning "Rolling back $service to $rollback_env environment..."
    
    switch_traffic "$service" "$rollback_env"
    
    success "Rollback completed for $service"
}

# Function to cleanup old environment
cleanup_old_environment() {
    local service=$1
    local old_environment=$2
    
    log "Cleaning up old $service deployment in $old_environment environment..."
    
    # Scale down old deployment
    kubectl scale deployment "$service" -n $NAMESPACE --replicas=0 --selector="version=$old_environment"
    
    success "Cleanup completed for $service in $old_environment environment"
}

# Main deployment function
main() {
    local image_tag=${1:-latest}
    local failed_services=()
    
    log "Starting blue-green deployment with image tag: $image_tag"
    
    # Store original environments for rollback
    declare -A original_environments
    
    for service in "${SERVICES[@]}"; do
        log "Processing service: $service"
        
        local active_env=$(get_active_environment "$service")
        local inactive_env=$(get_inactive_environment "$active_env")
        
        original_environments["$service"]="$active_env"
        
        log "$service: Active=$active_env, Deploying to=$inactive_env"
        
        # Deploy to inactive environment
        if ! deploy_to_inactive "$service" "$active_env" "$inactive_env" "$image_tag"; then
            error "Failed to deploy $service to $inactive_env environment"
            failed_services+=("$service")
            continue
        fi
        
        # Run health checks
        if ! run_health_checks "$service" "$inactive_env"; then
            error "Health checks failed for $service in $inactive_env environment"
            failed_services+=("$service")
            continue
        fi
        
        # Switch traffic
        switch_traffic "$service" "$inactive_env"
        
        success "$service deployment completed successfully"
    done
    
    # Run smoke tests
    if ! run_smoke_tests; then
        error "Smoke tests failed"
        failed_services=("${SERVICES[@]}")
    fi
    
    # Handle failures
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        error "Deployment failed for services: ${failed_services[*]}"
        
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            warning "Rolling back all services..."
            
            for service in "${SERVICES[@]}"; do
                rollback_deployment "$service" "${original_environments[$service]}"
            done
            
            error "Deployment failed and rolled back"
            exit 1
        else
            error "Deployment failed, manual intervention required"
            exit 1
        fi
    fi
    
    # Cleanup old environments
    for service in "${SERVICES[@]}"; do
        local old_env="${original_environments[$service]}"
        cleanup_old_environment "$service" "$old_env"
    done
    
    success "Blue-green deployment completed successfully!"
    log "All services are now running with image tag: $image_tag"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi