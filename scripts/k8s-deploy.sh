#!/bin/bash

# Kubernetes Deployment Script for RCM Application

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NAMESPACE="rcm-system"
ACTION=${1:-deploy}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Kubernetes Deployment Script for RCM Application

Usage: $0 [ACTION]

Actions:
  deploy       - Deploy the application to Kubernetes (default)
  delete       - Delete the application from Kubernetes
  update       - Update the application
  status       - Show deployment status
  logs         - Show application logs
  scale        - Scale the application
  rollback     - Rollback to previous version

Examples:
  $0 deploy
  $0 status
  $0 logs
  $0 scale 5

EOF
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building and pushing Docker image..."
    
    cd "$PROJECT_ROOT"
    
    # Build the image
    docker build -t rcm-app:latest .
    
    # Tag for registry (update with your registry)
    docker tag rcm-app:latest your-registry/rcm-app:latest
    docker tag rcm-app:latest your-registry/rcm-app:$(git rev-parse --short HEAD)
    
    # Push to registry
    docker push your-registry/rcm-app:latest
    docker push your-registry/rcm-app:$(git rev-parse --short HEAD)
    
    log_success "Docker image built and pushed"
}

# Deploy to Kubernetes
deploy_to_k8s() {
    log_info "Deploying to Kubernetes..."
    
    cd "$PROJECT_ROOT"
    
    # Create namespace
    kubectl apply -f k8s/namespace.yaml
    
    # Apply configurations
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secrets.yaml
    kubectl apply -f k8s/pvc.yaml
    kubectl apply -f k8s/deployment.yaml
    kubectl apply -f k8s/service.yaml
    kubectl apply -f k8s/ingress.yaml
    
    # Wait for deployments to be ready
    log_info "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/rcm-app -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/rcm-mysql -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/rcm-redis -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/rcm-nginx -n $NAMESPACE
    
    log_success "Application deployed successfully"
}

# Delete from Kubernetes
delete_from_k8s() {
    log_info "Deleting from Kubernetes..."
    
    cd "$PROJECT_ROOT"
    
    # Delete resources
    kubectl delete -f k8s/ingress.yaml --ignore-not-found=true
    kubectl delete -f k8s/service.yaml --ignore-not-found=true
    kubectl delete -f k8s/deployment.yaml --ignore-not-found=true
    kubectl delete -f k8s/pvc.yaml --ignore-not-found=true
    kubectl delete -f k8s/secrets.yaml --ignore-not-found=true
    kubectl delete -f k8s/configmap.yaml --ignore-not-found=true
    kubectl delete -f k8s/namespace.yaml --ignore-not-found=true
    
    log_success "Application deleted successfully"
}

# Update deployment
update_deployment() {
    log_info "Updating deployment..."
    
    # Build and push new image
    build_and_push_image
    
    # Update deployment
    kubectl set image deployment/rcm-app rcm-app=your-registry/rcm-app:$(git rev-parse --short HEAD) -n $NAMESPACE
    
    # Wait for rollout
    kubectl rollout status deployment/rcm-app -n $NAMESPACE
    
    log_success "Deployment updated successfully"
}

# Show status
show_status() {
    log_info "Deployment status:"
    
    echo "Namespaces:"
    kubectl get namespaces | grep $NAMESPACE
    
    echo -e "\nDeployments:"
    kubectl get deployments -n $NAMESPACE
    
    echo -e "\nPods:"
    kubectl get pods -n $NAMESPACE
    
    echo -e "\nServices:"
    kubectl get services -n $NAMESPACE
    
    echo -e "\nIngress:"
    kubectl get ingress -n $NAMESPACE
}

# Show logs
show_logs() {
    local pod_name=${2:-}
    
    if [[ -z "$pod_name" ]]; then
        log_info "Available pods:"
        kubectl get pods -n $NAMESPACE
        echo
        log_info "Usage: $0 logs [POD_NAME]"
        return
    fi
    
    kubectl logs -f "$pod_name" -n $NAMESPACE
}

# Scale deployment
scale_deployment() {
    local replicas=${2:-3}
    
    log_info "Scaling deployment to $replicas replicas..."
    
    kubectl scale deployment/rcm-app --replicas=$replicas -n $NAMESPACE
    
    # Wait for scaling
    kubectl rollout status deployment/rcm-app -n $NAMESPACE
    
    log_success "Deployment scaled to $replicas replicas"
}

# Rollback deployment
rollback_deployment() {
    log_info "Rolling back deployment..."
    
    kubectl rollout undo deployment/rcm-app -n $NAMESPACE
    
    # Wait for rollback
    kubectl rollout status deployment/rcm-app -n $NAMESPACE
    
    log_success "Deployment rolled back successfully"
}

# Main execution
main() {
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
    esac
    
    check_prerequisites
    
    case $ACTION in
        deploy)
            build_and_push_image
            deploy_to_k8s
            ;;
        delete)
            delete_from_k8s
            ;;
        update)
            update_deployment
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$@"
            ;;
        scale)
            scale_deployment "$@"
            ;;
        rollback)
            rollback_deployment
            ;;
        *)
            log_error "Invalid action: $ACTION"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"