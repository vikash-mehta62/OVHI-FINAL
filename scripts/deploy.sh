#!/bin/bash

# RCM Application Deployment Script
# Supports multiple environments: development, staging, production

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-development}
ACTION=${2:-deploy}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
RCM Application Deployment Script

Usage: $0 [ENVIRONMENT] [ACTION]

Environments:
  development  - Local development environment (default)
  staging      - Staging environment for testing
  production   - Production environment

Actions:
  deploy       - Deploy the application (default)
  start        - Start services
  stop         - Stop services
  restart      - Restart services
  logs         - Show logs
  status       - Show service status
  backup       - Create backup
  restore      - Restore from backup
  update       - Update application
  rollback     - Rollback to previous version
  health       - Check application health
  cleanup      - Clean up old resources

Examples:
  $0 development deploy
  $0 production start
  $0 staging logs
  $0 production backup

EOF
}

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            log_info "Environment: $ENVIRONMENT"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            show_help
            exit 1
            ;;
    esac
}

# Load environment configuration
load_environment() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [[ -f "$env_file" ]]; then
        log_info "Loading environment configuration from $env_file"
        set -a  # Automatically export all variables
        source "$env_file"
        set +a
    else
        log_warning "Environment file not found: $env_file"
        if [[ "$ENVIRONMENT" == "production" ]]; then
            log_error "Production environment file is required"
            exit 1
        fi
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if required environment variables are set
    local required_vars=()
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        required_vars=("DB_USER" "DB_PASS" "JWT_SECRET" "REDIS_PASSWORD")
    fi
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Check disk space
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        log_warning "Low disk space: $(($available_space / 1024))MB available"
    fi
    
    log_success "Pre-deployment checks passed"
}

# Build application
build_application() {
    log_info "Building application..."
    
    cd "$PROJECT_ROOT"
    
    # Choose the appropriate docker-compose file
    local compose_file="docker-compose.yml"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        compose_file="docker-compose.prod.yml"
    fi
    
    # Build images
    docker-compose -f "$compose_file" build --no-cache
    
    log_success "Application built successfully"
}

# Deploy application
deploy_application() {
    log_info "Deploying application to $ENVIRONMENT..."
    
    cd "$PROJECT_ROOT"
    
    local compose_file="docker-compose.yml"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        compose_file="docker-compose.prod.yml"
    fi
    
    # Create backup before deployment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        create_backup
    fi
    
    # Pull latest images
    docker-compose -f "$compose_file" pull
    
    # Start services
    docker-compose -f "$compose_file" up -d
    
    # Wait for services to be ready
    wait_for_services
    
    # Run health checks
    check_health
    
    log_success "Application deployed successfully"
}

# Start services
start_services() {
    log_info "Starting services..."
    
    cd "$PROJECT_ROOT"
    
    local compose_file="docker-compose.yml"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        compose_file="docker-compose.prod.yml"
    fi
    
    docker-compose -f "$compose_file" up -d
    
    log_success "Services started"
}

# Stop services
stop_services() {
    log_info "Stopping services..."
    
    cd "$PROJECT_ROOT"
    
    local compose_file="docker-compose.yml"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        compose_file="docker-compose.prod.yml"
    fi
    
    docker-compose -f "$compose_file" down
    
    log_success "Services stopped"
}

# Restart services
restart_services() {
    log_info "Restarting services..."
    stop_services
    start_services
}

# Show logs
show_logs() {
    cd "$PROJECT_ROOT"
    
    local compose_file="docker-compose.yml"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        compose_file="docker-compose.prod.yml"
    fi
    
    docker-compose -f "$compose_file" logs -f
}

# Show service status
show_status() {
    log_info "Service status:"
    
    cd "$PROJECT_ROOT"
    
    local compose_file="docker-compose.yml"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        compose_file="docker-compose.prod.yml"
    fi
    
    docker-compose -f "$compose_file" ps
}

# Wait for services to be ready
wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:3000/api/v1/monitoring/health &> /dev/null; then
            log_success "Services are ready"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - Services not ready yet, waiting..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Services failed to start within expected time"
    return 1
}

# Health check
check_health() {
    log_info "Performing health check..."
    
    local health_url="http://localhost:3000/api/v1/monitoring/health"
    
    if curl -f "$health_url" &> /dev/null; then
        local health_response=$(curl -s "$health_url")
        log_success "Health check passed"
        echo "$health_response" | jq '.' 2>/dev/null || echo "$health_response"
    else
        log_error "Health check failed"
        return 1
    fi
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    
    local backup_dir="/var/backups/rcm"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_name="rcm_backup_${timestamp}"
    
    mkdir -p "$backup_dir"
    
    # Database backup
    if [[ -n "$DB_USER" && -n "$DB_PASS" ]]; then
        log_info "Backing up database..."
        docker exec rcm-db-prod mysqldump -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$backup_dir/${backup_name}_db.sql"
    fi
    
    # Application files backup
    log_info "Backing up application files..."
    tar -czf "$backup_dir/${backup_name}_files.tar.gz" -C "$PROJECT_ROOT" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=temp \
        .
    
    # Configuration backup
    log_info "Backing up configuration..."
    mkdir -p "$backup_dir/${backup_name}_config"
    cp -r "$PROJECT_ROOT"/.env.* "$backup_dir/${backup_name}_config/" 2>/dev/null || true
    
    log_success "Backup created: $backup_name"
    echo "$backup_name" > "$backup_dir/latest_backup"
}

# Restore from backup
restore_backup() {
    local backup_name=${3:-$(cat /var/backups/rcm/latest_backup 2>/dev/null)}
    
    if [[ -z "$backup_name" ]]; then
        log_error "No backup specified and no latest backup found"
        exit 1
    fi
    
    log_info "Restoring from backup: $backup_name"
    
    local backup_dir="/var/backups/rcm"
    
    # Stop services
    stop_services
    
    # Restore database
    if [[ -f "$backup_dir/${backup_name}_db.sql" ]]; then
        log_info "Restoring database..."
        docker exec -i rcm-db-prod mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$backup_dir/${backup_name}_db.sql"
    fi
    
    # Restore application files
    if [[ -f "$backup_dir/${backup_name}_files.tar.gz" ]]; then
        log_info "Restoring application files..."
        tar -xzf "$backup_dir/${backup_name}_files.tar.gz" -C "$PROJECT_ROOT"
    fi
    
    # Start services
    start_services
    
    log_success "Restore completed"
}

# Update application
update_application() {
    log_info "Updating application..."
    
    # Pull latest code
    git pull origin main
    
    # Rebuild and deploy
    build_application
    deploy_application
    
    log_success "Application updated"
}

# Rollback to previous version
rollback_application() {
    log_info "Rolling back application..."
    
    # Get previous commit
    local previous_commit=$(git rev-parse HEAD~1)
    
    # Checkout previous version
    git checkout "$previous_commit"
    
    # Rebuild and deploy
    build_application
    deploy_application
    
    log_success "Rollback completed"
}

# Cleanup old resources
cleanup_resources() {
    log_info "Cleaning up old resources..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    # Remove old backups (keep last 7 days)
    find /var/backups/rcm -name "rcm_backup_*" -mtime +7 -delete 2>/dev/null || true
    
    # Clean up logs (keep last 30 days)
    find /var/log/rcm -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Main execution
main() {
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
    esac
    
    validate_environment
    load_environment
    check_prerequisites
    
    case $ACTION in
        deploy)
            pre_deployment_checks
            build_application
            deploy_application
            ;;
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        backup)
            create_backup
            ;;
        restore)
            restore_backup
            ;;
        update)
            update_application
            ;;
        rollback)
            rollback_application
            ;;
        health)
            check_health
            ;;
        cleanup)
            cleanup_resources
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