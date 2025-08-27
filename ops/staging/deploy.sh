#!/bin/bash
# Created automatically by Cursor AI (2024-12-19)

set -euo pipefail

# Staging deployment script for RAG PDF Q&A SaaS
# This script deploys the application to staging environment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

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

# Configuration
ENVIRONMENT="staging"
REGION="us-east-1"
CLUSTER_NAME="rag-staging-cluster"
NAMESPACE="rag-staging"

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    log_info "Loading environment variables from .env"
    export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
else
    log_warning "No .env file found, using default values"
fi

# Validate required environment variables
required_vars=(
    "STAGING_DB_HOST"
    "STAGING_DB_NAME"
    "STAGING_DB_USER"
    "STAGING_DB_PASSWORD"
    "STAGING_REDIS_URL"
    "STAGING_NATS_URL"
    "STAGING_S3_BUCKET"
    "STAGING_S3_ACCESS_KEY"
    "STAGING_S3_SECRET_KEY"
    "STAGING_OPENAI_API_KEY"
    "STAGING_SENTRY_DSN"
    "STAGING_PROMETHEUS_URL"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
        log_error "Required environment variable $var is not set"
        exit 1
    fi
done

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_tools=()
    
    if ! command_exists docker; then
        missing_tools+=("docker")
    fi
    
    if ! command_exists kubectl; then
        missing_tools+=("kubectl")
    fi
    
    if ! command_exists helm; then
        missing_tools+=("helm")
    fi
    
    if ! command_exists terraform; then
        missing_tools+=("terraform")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    log_success "All prerequisites are installed"
}

# Function to build Docker images
build_images() {
    log_info "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build gateway image
    log_info "Building gateway image..."
    docker build -t rag-gateway:staging -f apps/gateway/Dockerfile .
    
    # Build workers image
    log_info "Building workers image..."
    docker build -t rag-workers:staging -f apps/workers/Dockerfile .
    
    # Build frontend image
    log_info "Building frontend image..."
    docker build -t rag-frontend:staging -f apps/frontend/Dockerfile .
    
    log_success "All Docker images built successfully"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    
    cd "$PROJECT_ROOT/ops/terraform"
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -var-file="staging.tfvars" -out=staging.plan
    
    # Apply deployment
    terraform apply staging.plan
    
    log_success "Infrastructure deployed successfully"
}

# Function to deploy to Kubernetes
deploy_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    cd "$SCRIPT_DIR"
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply ConfigMaps and Secrets
    log_info "Applying ConfigMaps and Secrets..."
    kubectl apply -f k8s/configmaps.yaml -n "$NAMESPACE"
    kubectl apply -f k8s/secrets.yaml -n "$NAMESPACE"
    
    # Deploy database
    log_info "Deploying PostgreSQL with pgvector..."
    helm upgrade --install postgres bitnami/postgresql \
        --namespace "$NAMESPACE" \
        --values k8s/postgres-values.yaml \
        --set postgresql.auth.postgresPassword="$STAGING_DB_PASSWORD" \
        --set postgresql.auth.database="$STAGING_DB_NAME"
    
    # Deploy Redis
    log_info "Deploying Redis..."
    helm upgrade --install redis bitnami/redis \
        --namespace "$NAMESPACE" \
        --values k8s/redis-values.yaml
    
    # Deploy NATS
    log_info "Deploying NATS..."
    helm upgrade --install nats nats/nats \
        --namespace "$NAMESPACE" \
        --values k8s/nats-values.yaml
    
    # Deploy MinIO
    log_info "Deploying MinIO..."
    helm upgrade --install minio bitnami/minio \
        --namespace "$NAMESPACE" \
        --values k8s/minio-values.yaml \
        --set auth.rootUser="$STAGING_S3_ACCESS_KEY" \
        --set auth.rootPassword="$STAGING_S3_SECRET_KEY"
    
    # Deploy Prometheus
    log_info "Deploying Prometheus..."
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace "$NAMESPACE" \
        --values k8s/prometheus-values.yaml
    
    # Deploy Grafana
    log_info "Deploying Grafana..."
    helm upgrade --install grafana grafana/grafana \
        --namespace "$NAMESPACE" \
        --values k8s/grafana-values.yaml
    
    # Deploy application services
    log_info "Deploying application services..."
    kubectl apply -f k8s/gateway-deployment.yaml -n "$NAMESPACE"
    kubectl apply -f k8s/workers-deployment.yaml -n "$NAMESPACE"
    kubectl apply -f k8s/frontend-deployment.yaml -n "$NAMESPACE"
    
    # Deploy services
    kubectl apply -f k8s/services.yaml -n "$NAMESPACE"
    
    # Deploy ingress
    kubectl apply -f k8s/ingress.yaml -n "$NAMESPACE"
    
    log_success "Kubernetes deployment completed"
}

# Function to run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=300s
    
    # Run migrations using the gateway pod
    log_info "Running migrations..."
    kubectl exec -n "$NAMESPACE" deployment/rag-gateway -- npm run migration:run
    
    log_success "Database migrations completed"
}

# Function to run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # Wait for all pods to be ready
    log_info "Waiting for all pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=rag-gateway -n "$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=rag-workers -n "$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=rag-frontend -n "$NAMESPACE" --timeout=300s
    
    # Check gateway health
    log_info "Checking gateway health..."
    GATEWAY_URL=$(kubectl get ingress rag-ingress -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    if [ -n "$GATEWAY_URL" ]; then
        for i in {1..30}; do
            if curl -f "https://$GATEWAY_URL/health" >/dev/null 2>&1; then
                log_success "Gateway is healthy"
                break
            fi
            log_info "Waiting for gateway to be healthy... (attempt $i/30)"
            sleep 10
        done
    else
        log_warning "Could not determine gateway URL"
    fi
    
    # Check worker health
    log_info "Checking worker health..."
    WORKER_POD=$(kubectl get pod -l app=rag-workers -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
    if kubectl exec -n "$NAMESPACE" "$WORKER_POD" -- python -c "import requests; requests.get('http://localhost:8000/health')" >/dev/null 2>&1; then
        log_success "Workers are healthy"
    else
        log_warning "Workers health check failed"
    fi
    
    log_success "Health checks completed"
}

# Function to run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run basic smoke tests
    if python -m pytest tests/smoke/ -v --tb=short; then
        log_success "Smoke tests passed"
    else
        log_error "Smoke tests failed"
        exit 1
    fi
}

# Function to setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Configure Grafana dashboards
    log_info "Configuring Grafana dashboards..."
    kubectl apply -f k8s/grafana-dashboards.yaml -n "$NAMESPACE"
    
    # Configure Prometheus alerts
    log_info "Configuring Prometheus alerts..."
    kubectl apply -f k8s/prometheus-alerts.yaml -n "$NAMESPACE"
    
    # Setup log aggregation
    log_info "Setting up log aggregation..."
    kubectl apply -f k8s/fluentd-config.yaml -n "$NAMESPACE"
    
    log_success "Monitoring setup completed"
}

# Function to display deployment info
display_deployment_info() {
    log_info "Deployment completed successfully!"
    echo
    echo "=== Deployment Information ==="
    echo "Environment: $ENVIRONMENT"
    echo "Namespace: $NAMESPACE"
    echo "Cluster: $CLUSTER_NAME"
    echo
    
    echo "=== Service URLs ==="
    GATEWAY_URL=$(kubectl get ingress rag-ingress -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "Not available")
    echo "Gateway: https://$GATEWAY_URL"
    echo "Grafana: http://grafana.$GATEWAY_URL"
    echo "Prometheus: http://prometheus.$GATEWAY_URL"
    echo
    
    echo "=== Useful Commands ==="
    echo "View pods: kubectl get pods -n $NAMESPACE"
    echo "View logs: kubectl logs -f deployment/rag-gateway -n $NAMESPACE"
    echo "Port forward: kubectl port-forward svc/rag-gateway 3000:3000 -n $NAMESPACE"
    echo
}

# Main deployment function
main() {
    log_info "Starting staging deployment..."
    echo
    
    # Check prerequisites
    check_prerequisites
    
    # Build images
    build_images
    
    # Deploy infrastructure
    deploy_infrastructure
    
    # Deploy to Kubernetes
    deploy_kubernetes
    
    # Run migrations
    run_migrations
    
    # Run health checks
    run_health_checks
    
    # Run smoke tests
    run_smoke_tests
    
    # Setup monitoring
    setup_monitoring
    
    # Display deployment info
    display_deployment_info
    
    log_success "Staging deployment completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "build")
        build_images
        ;;
    "infrastructure")
        deploy_infrastructure
        ;;
    "kubernetes")
        deploy_kubernetes
        ;;
    "migrations")
        run_migrations
        ;;
    "health")
        run_health_checks
        ;;
    "smoke")
        run_smoke_tests
        ;;
    "monitoring")
        setup_monitoring
        ;;
    "full"|"")
        main
        ;;
    *)
        echo "Usage: $0 [build|infrastructure|kubernetes|migrations|health|smoke|monitoring|full]"
        exit 1
        ;;
esac
