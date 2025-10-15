#!/bin/bash

set -e

# Infrastructure Validation Script for AI Coding Platform
# This script validates the Kubernetes infrastructure and deployment

NAMESPACE="ai-coding-platform"
TIMEOUT=300

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

# Function to check if kubectl is available and configured
check_kubectl() {
    log "Checking kubectl configuration..."
    
    if ! command -v kubectl >/dev/null 2>&1; then
        error "kubectl is not installed or not in PATH"
        return 1
    fi
    
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error "kubectl is not configured or cluster is not accessible"
        return 1
    fi
    
    success "kubectl is configured and cluster is accessible"
    return 0
}

# Function to validate namespace
validate_namespace() {
    log "Validating namespace..."
    
    if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        success "Namespace $NAMESPACE exists"
    else
        error "Namespace $NAMESPACE does not exist"
        return 1
    fi
    
    return 0
}

# Function to validate deployments
validate_deployments() {
    log "Validating deployments..."
    
    local deployments=("api-gateway" "user-service" "problem-service" "code-execution-service" "ai-analysis-service")
    local failed_deployments=()
    
    for deployment in "${deployments[@]}"; do
        log "Checking deployment: $deployment"
        
        if ! kubectl get deployment "$deployment" -n "$NAMESPACE" >/dev/null 2>&1; then
            error "Deployment $deployment does not exist"
            failed_deployments+=("$deployment")
            continue
        fi
        
        # Check if deployment is available
        local available=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' 2>/dev/null)
        if [ "$available" != "True" ]; then
            error "Deployment $deployment is not available"
            failed_deployments+=("$deployment")
            continue
        fi
        
        # Check replica count
        local desired=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
        local ready=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
        
        if [ "$desired" != "$ready" ]; then
            error "Deployment $deployment has $ready/$desired replicas ready"
            failed_deployments+=("$deployment")
            continue
        fi
        
        success "Deployment $deployment is healthy ($ready/$desired replicas)"
    done
    
    if [ ${#failed_deployments[@]} -gt 0 ]; then
        error "Failed deployments: ${failed_deployments[*]}"
        return 1
    fi
    
    return 0
}

# Function to validate StatefulSets (databases)
validate_statefulsets() {
    log "Validating StatefulSets..."
    
    local statefulsets=("postgres" "mongodb" "redis")
    local failed_statefulsets=()
    
    for statefulset in "${statefulsets[@]}"; do
        log "Checking StatefulSet: $statefulset"
        
        if ! kubectl get statefulset "$statefulset" -n "$NAMESPACE" >/dev/null 2>&1; then
            error "StatefulSet $statefulset does not exist"
            failed_statefulsets+=("$statefulset")
            continue
        fi
        
        # Check replica count
        local desired=$(kubectl get statefulset "$statefulset" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
        local ready=$(kubectl get statefulset "$statefulset" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
        
        if [ "$desired" != "$ready" ]; then
            error "StatefulSet $statefulset has $ready/$desired replicas ready"
            failed_statefulsets+=("$statefulset")
            continue
        fi
        
        success "StatefulSet $statefulset is healthy ($ready/$desired replicas)"
    done
    
    if [ ${#failed_statefulsets[@]} -gt 0 ]; then
        error "Failed StatefulSets: ${failed_statefulsets[*]}"
        return 1
    fi
    
    return 0
}

# Function to validate services
validate_services() {
    log "Validating services..."
    
    local services=("api-gateway-service" "user-service" "problem-service" "code-execution-service" "ai-analysis-service" "postgres-service" "mongodb-service" "redis-service")
    local failed_services=()
    
    for service in "${services[@]}"; do
        log "Checking service: $service"
        
        if ! kubectl get service "$service" -n "$NAMESPACE" >/dev/null 2>&1; then
            error "Service $service does not exist"
            failed_services+=("$service")
            continue
        fi
        
        # Check if service has endpoints
        local endpoints=$(kubectl get endpoints "$service" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null)
        if [ -z "$endpoints" ]; then
            error "Service $service has no endpoints"
            failed_services+=("$service")
            continue
        fi
        
        success "Service $service is healthy with endpoints"
    done
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        error "Failed services: ${failed_services[*]}"
        return 1
    fi
    
    return 0
}

# Function to validate pods
validate_pods() {
    log "Validating pods..."
    
    local failed_pods=()
    
    # Get all pods in the namespace
    local pods=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
    
    if [ -z "$pods" ]; then
        error "No pods found in namespace $NAMESPACE"
        return 1
    fi
    
    for pod in $pods; do
        log "Checking pod: $pod"
        
        # Check pod status
        local phase=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null)
        if [ "$phase" != "Running" ]; then
            error "Pod $pod is in phase: $phase"
            failed_pods+=("$pod")
            continue
        fi
        
        # Check if pod is ready
        local ready=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)
        if [ "$ready" != "True" ]; then
            error "Pod $pod is not ready"
            failed_pods+=("$pod")
            continue
        fi
        
        # Check restart count
        local restarts=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.containerStatuses[0].restartCount}' 2>/dev/null)
        if [ "$restarts" -gt 5 ]; then
            warning "Pod $pod has high restart count: $restarts"
        fi
        
        success "Pod $pod is healthy (restarts: $restarts)"
    done
    
    if [ ${#failed_pods[@]} -gt 0 ]; then
        error "Failed pods: ${failed_pods[*]}"
        return 1
    fi
    
    return 0
}

# Function to validate persistent volumes
validate_persistent_volumes() {
    log "Validating persistent volumes..."
    
    local pvcs=$(kubectl get pvc -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
    
    if [ -z "$pvcs" ]; then
        warning "No persistent volume claims found"
        return 0
    fi
    
    local failed_pvcs=()
    
    for pvc in $pvcs; do
        log "Checking PVC: $pvc"
        
        local status=$(kubectl get pvc "$pvc" -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null)
        if [ "$status" != "Bound" ]; then
            error "PVC $pvc is in status: $status"
            failed_pvcs+=("$pvc")
            continue
        fi
        
        success "PVC $pvc is bound"
    done
    
    if [ ${#failed_pvcs[@]} -gt 0 ]; then
        error "Failed PVCs: ${failed_pvcs[*]}"
        return 1
    fi
    
    return 0
}

# Function to validate ingress
validate_ingress() {
    log "Validating ingress..."
    
    if ! kubectl get ingress -n "$NAMESPACE" >/dev/null 2>&1; then
        warning "No ingress resources found"
        return 0
    fi
    
    local ingresses=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
    
    for ingress in $ingresses; do
        log "Checking ingress: $ingress"
        
        # Check if ingress has an IP/hostname
        local address=$(kubectl get ingress "$ingress" -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
        if [ -z "$address" ]; then
            address=$(kubectl get ingress "$ingress" -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
        fi
        
        if [ -z "$address" ]; then
            warning "Ingress $ingress has no external address"
        else
            success "Ingress $ingress has address: $address"
        fi
    done
    
    return 0
}

# Function to validate HPA
validate_hpa() {
    log "Validating Horizontal Pod Autoscalers..."
    
    local hpas=$(kubectl get hpa -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
    
    if [ -z "$hpas" ]; then
        warning "No HPA resources found"
        return 0
    fi
    
    for hpa in $hpas; do
        log "Checking HPA: $hpa"
        
        # Check if HPA can get metrics
        local current_replicas=$(kubectl get hpa "$hpa" -n "$NAMESPACE" -o jsonpath='{.status.currentReplicas}' 2>/dev/null)
        local desired_replicas=$(kubectl get hpa "$hpa" -n "$NAMESPACE" -o jsonpath='{.status.desiredReplicas}' 2>/dev/null)
        
        if [ -n "$current_replicas" ] && [ -n "$desired_replicas" ]; then
            success "HPA $hpa is active (current: $current_replicas, desired: $desired_replicas)"
        else
            warning "HPA $hpa may not be getting metrics"
        fi
    done
    
    return 0
}

# Function to validate ConfigMaps and Secrets
validate_config() {
    log "Validating ConfigMaps and Secrets..."
    
    # Check required ConfigMaps
    local required_configmaps=("app-config" "database-config")
    for cm in "${required_configmaps[@]}"; do
        if kubectl get configmap "$cm" -n "$NAMESPACE" >/dev/null 2>&1; then
            success "ConfigMap $cm exists"
        else
            error "ConfigMap $cm does not exist"
            return 1
        fi
    done
    
    # Check required Secrets
    local required_secrets=("app-secrets")
    for secret in "${required_secrets[@]}"; do
        if kubectl get secret "$secret" -n "$NAMESPACE" >/dev/null 2>&1; then
            success "Secret $secret exists"
        else
            error "Secret $secret does not exist"
            return 1
        fi
    done
    
    return 0
}

# Function to validate resource usage
validate_resource_usage() {
    log "Validating resource usage..."
    
    # Check node resource usage
    local nodes=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
    
    for node in $nodes; do
        log "Checking node resource usage: $node"
        
        # Get node capacity and allocatable resources
        local cpu_capacity=$(kubectl get node "$node" -o jsonpath='{.status.capacity.cpu}' 2>/dev/null)
        local memory_capacity=$(kubectl get node "$node" -o jsonpath='{.status.capacity.memory}' 2>/dev/null)
        
        # Check if node is ready
        local ready=$(kubectl get node "$node" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)
        if [ "$ready" != "True" ]; then
            error "Node $node is not ready"
            return 1
        fi
        
        success "Node $node is ready (CPU: $cpu_capacity, Memory: $memory_capacity)"
    done
    
    return 0
}

# Function to check monitoring stack
validate_monitoring() {
    log "Validating monitoring stack..."
    
    # Check if monitoring namespace exists
    if ! kubectl get namespace monitoring >/dev/null 2>&1; then
        warning "Monitoring namespace does not exist"
        return 0
    fi
    
    # Check Prometheus
    if kubectl get deployment prometheus -n monitoring >/dev/null 2>&1; then
        local prometheus_ready=$(kubectl get deployment prometheus -n monitoring -o jsonpath='{.status.readyReplicas}' 2>/dev/null)
        if [ "$prometheus_ready" -gt 0 ]; then
            success "Prometheus is running"
        else
            warning "Prometheus is not ready"
        fi
    else
        warning "Prometheus deployment not found"
    fi
    
    # Check Grafana
    if kubectl get deployment grafana -n monitoring >/dev/null 2>&1; then
        local grafana_ready=$(kubectl get deployment grafana -n monitoring -o jsonpath='{.status.readyReplicas}' 2>/dev/null)
        if [ "$grafana_ready" -gt 0 ]; then
            success "Grafana is running"
        else
            warning "Grafana is not ready"
        fi
    else
        warning "Grafana deployment not found"
    fi
    
    return 0
}

# Function to generate validation report
generate_report() {
    log "Generating validation report..."
    
    local report_file="/tmp/infrastructure-validation-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "AI Coding Platform Infrastructure Validation Report"
        echo "=================================================="
        echo "Generated: $(date)"
        echo "Namespace: $NAMESPACE"
        echo ""
        
        echo "Cluster Information:"
        kubectl cluster-info
        echo ""
        
        echo "Node Status:"
        kubectl get nodes -o wide
        echo ""
        
        echo "Deployments:"
        kubectl get deployments -n "$NAMESPACE" -o wide
        echo ""
        
        echo "StatefulSets:"
        kubectl get statefulsets -n "$NAMESPACE" -o wide
        echo ""
        
        echo "Services:"
        kubectl get services -n "$NAMESPACE" -o wide
        echo ""
        
        echo "Pods:"
        kubectl get pods -n "$NAMESPACE" -o wide
        echo ""
        
        echo "PVCs:"
        kubectl get pvc -n "$NAMESPACE"
        echo ""
        
        echo "HPA:"
        kubectl get hpa -n "$NAMESPACE"
        echo ""
        
        echo "Ingress:"
        kubectl get ingress -n "$NAMESPACE"
        echo ""
        
    } > "$report_file"
    
    success "Validation report generated: $report_file"
    return 0
}

# Main validation function
main() {
    log "Starting infrastructure validation for AI Coding Platform"
    
    local failed_validations=0
    local total_validations=0
    
    # Run all validations
    validations=(
        "check_kubectl"
        "validate_namespace"
        "validate_config"
        "validate_statefulsets"
        "validate_deployments"
        "validate_services"
        "validate_pods"
        "validate_persistent_volumes"
        "validate_ingress"
        "validate_hpa"
        "validate_resource_usage"
        "validate_monitoring"
    )
    
    for validation in "${validations[@]}"; do
        total_validations=$((total_validations + 1))
        
        log "Running $validation..."
        if ! $validation; then
            failed_validations=$((failed_validations + 1))
        fi
        
        echo ""
    done
    
    # Generate report
    generate_report
    
    # Summary
    log "Infrastructure validation completed"
    log "Total validations: $total_validations"
    log "Failed validations: $failed_validations"
    log "Passed validations: $((total_validations - failed_validations))"
    
    if [ $failed_validations -eq 0 ]; then
        success "All infrastructure validations passed!"
        return 0
    else
        error "$failed_validations out of $total_validations validations failed"
        return 1
    fi
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi