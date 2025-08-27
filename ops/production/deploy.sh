#!/bin/bash
# Created automatically by Cursor AI (2024-12-19)

set -euo pipefail

# Production deployment script for RAG PDF Q&A SaaS
# This script deploys the application to production environment with monitoring & alerting

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
ENVIRONMENT="production"
REGION="us-east-1"
CLUSTER_NAME="rag-production-cluster"
NAMESPACE="rag-production"

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    log_info "Loading environment variables from .env"
    export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
else
    log_error "Production .env file is required but not found"
    exit 1
fi

# Validate required environment variables
required_vars=(
    "PROD_DB_HOST"
    "PROD_DB_NAME"
    "PROD_DB_USER"
    "PROD_DB_PASSWORD"
    "PROD_REDIS_URL"
    "PROD_NATS_URL"
    "PROD_S3_BUCKET"
    "PROD_S3_ACCESS_KEY"
    "PROD_S3_SECRET_KEY"
    "PROD_OPENAI_API_KEY"
    "PROD_SENTRY_DSN"
    "PROD_PROMETHEUS_URL"
    "PROD_ALERTMANAGER_URL"
    "PROD_SLACK_WEBHOOK_URL"
    "PROD_PAGERDUTY_KEY"
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

# Function to build and push Docker images
build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build and push gateway image
    log_info "Building and pushing gateway image..."
    docker build -t rag-gateway:production -f apps/gateway/Dockerfile .
    docker tag rag-gateway:production $PROD_REGISTRY/rag-gateway:production
    docker push $PROD_REGISTRY/rag-gateway:production
    
    # Build and push workers image
    log_info "Building and pushing workers image..."
    docker build -t rag-workers:production -f apps/workers/Dockerfile .
    docker tag rag-workers:production $PROD_REGISTRY/rag-workers:production
    docker push $PROD_REGISTRY/rag-workers:production
    
    # Build and push frontend image
    log_info "Building and pushing frontend image..."
    docker build -t rag-frontend:production -f apps/frontend/Dockerfile .
    docker tag rag-frontend:production $PROD_REGISTRY/rag-frontend:production
    docker push $PROD_REGISTRY/rag-frontend:production
    
    log_success "All Docker images built and pushed successfully"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    log_info "Deploying production infrastructure with Terraform..."
    
    cd "$PROJECT_ROOT/ops/terraform"
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -var-file="production.tfvars" -out=production.plan
    
    # Apply deployment
    terraform apply production.plan
    
    log_success "Production infrastructure deployed successfully"
}

# Function to deploy monitoring stack
deploy_monitoring_stack() {
    log_info "Deploying monitoring stack..."
    
    cd "$SCRIPT_DIR"
    
    # Deploy Prometheus with AlertManager
    log_info "Deploying Prometheus with AlertManager..."
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace "$NAMESPACE" \
        --values k8s/prometheus-production-values.yaml \
        --set alertmanager.config.global.slack_api_url="$PROD_SLACK_WEBHOOK_URL" \
        --set alertmanager.config.global.pagerduty_url="$PROD_PAGERDUTY_KEY"
    
    # Deploy Grafana with production dashboards
    log_info "Deploying Grafana with production dashboards..."
    helm upgrade --install grafana grafana/grafana \
        --namespace "$NAMESPACE" \
        --values k8s/grafana-production-values.yaml \
        --set adminPassword="$PROD_GRAFANA_PASSWORD"
    
    # Deploy Loki for log aggregation
    log_info "Deploying Loki for log aggregation..."
    helm upgrade --install loki grafana/loki \
        --namespace "$NAMESPACE" \
        --values k8s/loki-production-values.yaml
    
    # Deploy Promtail for log collection
    log_info "Deploying Promtail for log collection..."
    helm upgrade --install promtail grafana/promtail \
        --namespace "$NAMESPACE" \
        --values k8s/promtail-production-values.yaml
    
    # Deploy Jaeger for distributed tracing
    log_info "Deploying Jaeger for distributed tracing..."
    helm upgrade --install jaeger jaegertracing/jaeger \
        --namespace "$NAMESPACE" \
        --values k8s/jaeger-production-values.yaml
    
    log_success "Monitoring stack deployed successfully"
}

# Function to deploy application services
deploy_application_services() {
    log_info "Deploying application services..."
    
    cd "$SCRIPT_DIR"
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply ConfigMaps and Secrets
    log_info "Applying ConfigMaps and Secrets..."
    kubectl apply -f k8s/configmaps.yaml -n "$NAMESPACE"
    kubectl apply -f k8s/secrets.yaml -n "$NAMESPACE"
    
    # Deploy database with high availability
    log_info "Deploying PostgreSQL with high availability..."
    helm upgrade --install postgres bitnami/postgresql \
        --namespace "$NAMESPACE" \
        --values k8s/postgres-production-values.yaml \
        --set postgresql.auth.postgresPassword="$PROD_DB_PASSWORD" \
        --set postgresql.auth.database="$PROD_DB_NAME" \
        --set postgresql.primary.persistence.size=100Gi \
        --set postgresql.readReplicas.persistence.size=100Gi
    
    # Deploy Redis with high availability
    log_info "Deploying Redis with high availability..."
    helm upgrade --install redis bitnami/redis \
        --namespace "$NAMESPACE" \
        --values k8s/redis-production-values.yaml \
        --set auth.password="$PROD_REDIS_PASSWORD" \
        --set master.persistence.size=50Gi \
        --set replica.persistence.size=50Gi
    
    # Deploy NATS with clustering
    log_info "Deploying NATS with clustering..."
    helm upgrade --install nats nats/nats \
        --namespace "$NAMESPACE" \
        --values k8s/nats-production-values.yaml \
        --set cluster.enabled=true \
        --set cluster.replicas=3
    
    # Deploy MinIO with high availability
    log_info "Deploying MinIO with high availability..."
    helm upgrade --install minio bitnami/minio \
        --namespace "$NAMESPACE" \
        --values k8s/minio-production-values.yaml \
        --set auth.rootUser="$PROD_S3_ACCESS_KEY" \
        --set auth.rootPassword="$PROD_S3_SECRET_KEY" \
        --set persistence.size=500Gi
    
    # Deploy application services with high availability
    log_info "Deploying application services with high availability..."
    kubectl apply -f k8s/gateway-production-deployment.yaml -n "$NAMESPACE"
    kubectl apply -f k8s/workers-production-deployment.yaml -n "$NAMESPACE"
    kubectl apply -f k8s/frontend-production-deployment.yaml -n "$NAMESPACE"
    
    # Deploy services
    kubectl apply -f k8s/services.yaml -n "$NAMESPACE"
    
    # Deploy ingress with SSL
    kubectl apply -f k8s/ingress-production.yaml -n "$NAMESPACE"
    
    # Deploy horizontal pod autoscalers
    kubectl apply -f k8s/hpa.yaml -n "$NAMESPACE"
    
    log_success "Application services deployed successfully"
}

# Function to setup alerting rules
setup_alerting_rules() {
    log_info "Setting up alerting rules..."
    
    cd "$SCRIPT_DIR"
    
    # Apply Prometheus alerting rules
    log_info "Applying Prometheus alerting rules..."
    kubectl apply -f k8s/prometheus-alerts.yaml -n "$NAMESPACE"
    
    # Apply custom alerting rules
    kubectl apply -f k8s/custom-alerts.yaml -n "$NAMESPACE"
    
    # Setup Slack notifications
    log_info "Setting up Slack notifications..."
    kubectl apply -f k8s/slack-notifications.yaml -n "$NAMESPACE"
    
    # Setup PagerDuty integration
    log_info "Setting up PagerDuty integration..."
    kubectl apply -f k8s/pagerduty-integration.yaml -n "$NAMESPACE"
    
    log_success "Alerting rules configured successfully"
}

# Function to run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=600s
    
    # Run migrations using the gateway pod
    log_info "Running migrations..."
    kubectl exec -n "$NAMESPACE" deployment/rag-gateway -- npm run migration:run
    
    log_success "Database migrations completed"
}

# Function to run comprehensive health checks
run_health_checks() {
    log_info "Running comprehensive health checks..."
    
    # Wait for all pods to be ready
    log_info "Waiting for all pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=rag-gateway -n "$NAMESPACE" --timeout=600s
    kubectl wait --for=condition=ready pod -l app=rag-workers -n "$NAMESPACE" --timeout=600s
    kubectl wait --for=condition=ready pod -l app=rag-frontend -n "$NAMESPACE" --timeout=600s
    
    # Check gateway health
    log_info "Checking gateway health..."
    GATEWAY_URL=$(kubectl get ingress rag-ingress -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    if [ -n "$GATEWAY_URL" ]; then
        for i in {1..60}; do
            if curl -f "https://$GATEWAY_URL/health" >/dev/null 2>&1; then
                log_success "Gateway is healthy"
                break
            fi
            log_info "Waiting for gateway to be healthy... (attempt $i/60)"
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
    
    # Check monitoring stack health
    log_info "Checking monitoring stack health..."
    kubectl wait --for=condition=ready pod -l app=prometheus -n "$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=grafana -n "$NAMESPACE" --timeout=300s
    
    log_success "Health checks completed"
}

# Function to run production tests
run_production_tests() {
    log_info "Running production tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run smoke tests
    if python -m pytest tests/smoke/ -v --tb=short; then
        log_success "Smoke tests passed"
    else
        log_error "Smoke tests failed"
        exit 1
    fi
    
    # Run load tests
    if python -m pytest tests/load/ -v --tb=short; then
        log_success "Load tests passed"
    else
        log_error "Load tests failed"
        exit 1
    fi
    
    log_success "Production tests completed"
}

# Function to setup backup and disaster recovery
setup_backup_recovery() {
    log_info "Setting up backup and disaster recovery..."
    
    cd "$SCRIPT_DIR"
    
    # Deploy Velero for backup
    log_info "Deploying Velero for backup..."
    helm upgrade --install velero vmware-tanzu/velero \
        --namespace "$NAMESPACE" \
        --values k8s/velero-production-values.yaml
    
    # Setup database backup cronjob
    log_info "Setting up database backup cronjob..."
    kubectl apply -f k8s/db-backup-cronjob.yaml -n "$NAMESPACE"
    
    # Setup S3 backup cronjob
    log_info "Setting up S3 backup cronjob..."
    kubectl apply -f k8s/s3-backup-cronjob.yaml -n "$NAMESPACE"
    
    log_success "Backup and disaster recovery setup completed"
}

# Function to display production deployment info
display_production_info() {
    log_info "Production deployment completed successfully!"
    echo
    echo "=== Production Deployment Information ==="
    echo "Environment: $ENVIRONMENT"
    echo "Namespace: $NAMESPACE"
    echo "Cluster: $CLUSTER_NAME"
    echo "Region: $REGION"
    echo
    
    echo "=== Service URLs ==="
    GATEWAY_URL=$(kubectl get ingress rag-ingress -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "Not available")
    echo "Production Gateway: https://$GATEWAY_URL"
    echo "Grafana: https://grafana.$GATEWAY_URL"
    echo "Prometheus: https://prometheus.$GATEWAY_URL"
    echo "Jaeger: https://jaeger.$GATEWAY_URL"
    echo
    
    echo "=== Monitoring & Alerting ==="
    echo "Sentry DSN: $PROD_SENTRY_DSN"
    echo "Prometheus URL: $PROD_PROMETHEUS_URL"
    echo "AlertManager URL: $PROD_ALERTMANAGER_URL"
    echo "Slack Webhook: $PROD_SLACK_WEBHOOK_URL"
    echo
    
    echo "=== Useful Commands ==="
    echo "View pods: kubectl get pods -n $NAMESPACE"
    echo "View logs: kubectl logs -f deployment/rag-gateway -n $NAMESPACE"
    echo "Port forward: kubectl port-forward svc/rag-gateway 3000:3000 -n $NAMESPACE"
    echo "View alerts: kubectl port-forward svc/prometheus-alertmanager 9093:9093 -n $NAMESPACE"
    echo
}

# Main deployment function
main() {
    log_info "Starting production deployment with monitoring & alerting..."
    echo
    
    # Check prerequisites
    check_prerequisites
    
    # Build and push images
    build_and_push_images
    
    # Deploy infrastructure
    deploy_infrastructure
    
    # Deploy monitoring stack
    deploy_monitoring_stack
    
    # Deploy application services
    deploy_application_services
    
    # Setup alerting rules
    setup_alerting_rules
    
    # Run migrations
    run_migrations
    
    # Run health checks
    run_health_checks
    
    # Run production tests
    run_production_tests
    
    # Setup backup and recovery
    setup_backup_recovery
    
    # Display production info
    display_production_info
    
    log_success "Production deployment with monitoring & alerting completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "build")
        build_and_push_images
        ;;
    "infrastructure")
        deploy_infrastructure
        ;;
    "monitoring")
        deploy_monitoring_stack
        ;;
    "services")
        deploy_application_services
        ;;
    "alerting")
        setup_alerting_rules
        ;;
    "migrations")
        run_migrations
        ;;
    "health")
        run_health_checks
        ;;
    "tests")
        run_production_tests
        ;;
    "backup")
        setup_backup_recovery
        ;;
    "full"|"")
        main
        ;;
    *)
        echo "Usage: $0 [build|infrastructure|monitoring|services|alerting|migrations|health|tests|backup|full]"
        exit 1
        ;;
esac
