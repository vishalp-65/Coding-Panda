# AI Coding Platform - Production Deployment Guide

This guide provides comprehensive instructions for deploying the AI Coding Platform to production using Kubernetes with DevOps best practices.

## Prerequisites

### Required Tools
- Kubernetes cluster (v1.25+)
- kubectl configured with cluster access
- Docker registry access (GitHub Container Registry)
- AWS CLI (for backups)
- Helm (optional, for monitoring stack)

### Required Secrets
Before deployment, ensure you have the following secrets configured:

1. **Database passwords**
2. **JWT secrets**
3. **API keys** (OpenAI, email service)
4. **Registry credentials**
5. **Backup storage credentials**

## Deployment Steps

### 1. Prepare Secrets

```bash
# Create base64 encoded secrets
echo -n "your-jwt-secret" | base64
echo -n "your-postgres-password" | base64
echo -n "your-mongodb-password" | base64
echo -n "your-redis-password" | base64
echo -n "your-openai-api-key" | base64

# Update k8s/secrets.yaml with actual values
```

### 2. Deploy Infrastructure

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy configuration
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# Deploy databases
kubectl apply -f k8s/databases.yaml

# Wait for databases to be ready
kubectl wait --for=condition=available --timeout=300s statefulset --all -n ai-coding-platform
```

### 3. Run Database Migrations

```bash
# Apply migration job
kubectl apply -f k8s/migration-job.yaml

# Wait for migration to complete
kubectl wait --for=condition=complete --timeout=600s job/db-migration -n ai-coding-platform
```

### 4. Deploy Application Services

```bash
# Deploy all services
kubectl apply -f k8s/api-gateway.yaml
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/problem-service.yaml
kubectl apply -f k8s/code-execution-service.yaml
kubectl apply -f k8s/ai-analysis-service.yaml

# Wait for services to be ready
kubectl wait --for=condition=available --timeout=300s deployment --all -n ai-coding-platform
```

### 5. Configure Auto-scaling

```bash
# Deploy HPA and custom metrics
kubectl apply -f k8s/custom-metrics.yaml
```

### 6. Set up Ingress

```bash
# Deploy ingress controller (if not already installed)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Deploy application ingress
kubectl apply -f k8s/ingress.yaml
```

### 7. Deploy Monitoring Stack

```bash
# Create monitoring namespace
kubectl apply -f k8s/monitoring-stack.yaml

# Deploy alerting configuration
kubectl apply -f k8s/alertmanager-config.yaml
```

### 8. Set up Backup Jobs

```bash
# Deploy backup cronjobs
kubectl apply -f k8s/backup-cronjobs.yaml
```

### 9. Validate Deployment

```bash
# Run infrastructure validation
./scripts/infrastructure-validation.sh

# Run smoke tests
./scripts/smoke-tests.sh https://your-domain.com
```

## CI/CD Pipeline Setup

### GitHub Actions Configuration

1. **Set up repository secrets:**
   ```
   KUBE_CONFIG_PROD: Base64 encoded kubeconfig for production
   KUBE_CONFIG_STAGING: Base64 encoded kubeconfig for staging
   GITHUB_TOKEN: GitHub token for container registry
   SLACK_WEBHOOK: Slack webhook URL for notifications
   ```

2. **Configure environments:**
   - Create `staging` and `production` environments in GitHub
   - Set up protection rules for production environment

### Deployment Process

1. **Development workflow:**
   ```bash
   # Create feature branch
   git checkout -b feature/new-feature
   
   # Make changes and commit
   git commit -m "Add new feature"
   
   # Push and create PR
   git push origin feature/new-feature
   ```

2. **Staging deployment:**
   ```bash
   # Merge to develop branch triggers staging deployment
   git checkout develop
   git merge feature/new-feature
   git push origin develop
   ```

3. **Production deployment:**
   ```bash
   # Merge to main branch triggers production deployment
   git checkout main
   git merge develop
   git push origin main
   ```

## Blue-Green Deployment

### Manual Blue-Green Deployment

```bash
# Run blue-green deployment script
./scripts/blue-green-deploy.sh latest

# Monitor deployment progress
kubectl get pods -n ai-coding-platform -w
```

### Rollback Procedure

```bash
# If deployment fails, rollback is automatic
# For manual rollback:
kubectl rollout undo deployment/api-gateway -n ai-coding-platform
kubectl rollout undo deployment/user-service -n ai-coding-platform
# ... repeat for all services
```

## Backup and Disaster Recovery

### Automated Backups

Backups run automatically via CronJobs:
- **PostgreSQL**: Daily at 2 AM
- **MongoDB**: Daily at 3 AM  
- **Redis**: Daily at 4 AM

### Manual Backup

```bash
# Create point-in-time backup
./scripts/disaster-recovery.sh create-backup emergency-backup-$(date +%Y%m%d)
```

### Disaster Recovery

```bash
# List available backups
./scripts/disaster-recovery.sh list-backups postgres daily

# Full disaster recovery
./scripts/disaster-recovery.sh full-recovery \
  postgres_backup_20241014_020000.sql.gz \
  mongodb_backup_20241014_030000.gz \
  redis_backup_20241014_040000.rdb
```

## Monitoring and Alerting

### Access Monitoring Dashboards

1. **Prometheus**: `http://prometheus.your-domain.com`
2. **Grafana**: `http://grafana.your-domain.com`
   - Default credentials: admin/admin (change immediately)
3. **Alertmanager**: `http://alertmanager.your-domain.com`

### Key Metrics to Monitor

- **Application metrics**: Response time, error rate, throughput
- **Infrastructure metrics**: CPU, memory, disk usage
- **Business metrics**: User registrations, problem submissions, contest participation

### Alert Configuration

Alerts are configured for:
- Service downtime
- High error rates
- Performance degradation
- Resource exhaustion
- Database issues

## Security Considerations

### Network Security
- All services communicate within cluster network
- External access only through ingress controller
- TLS termination at ingress level

### Container Security
- Non-root containers
- Read-only root filesystems where possible
- Resource limits enforced
- Security contexts configured

### Data Security
- Secrets stored in Kubernetes secrets
- Database connections encrypted
- Sensitive data encrypted at rest

## Scaling Guidelines

### Horizontal Scaling
- API Gateway: 3-20 replicas based on traffic
- User Service: 2-8 replicas based on authentication load
- Problem Service: 2-6 replicas based on problem access
- Code Execution: 3-50 replicas based on execution queue
- AI Analysis: 2-10 replicas based on AI processing load

### Vertical Scaling
- Increase resource limits in deployment manifests
- Monitor resource usage and adjust accordingly

## Troubleshooting

### Common Issues

1. **Pod not starting:**
   ```bash
   kubectl describe pod <pod-name> -n ai-coding-platform
   kubectl logs <pod-name> -n ai-coding-platform
   ```

2. **Service not accessible:**
   ```bash
   kubectl get endpoints <service-name> -n ai-coding-platform
   kubectl describe service <service-name> -n ai-coding-platform
   ```

3. **Database connection issues:**
   ```bash
   kubectl exec -it <pod-name> -n ai-coding-platform -- /bin/sh
   # Test database connectivity from within pod
   ```

### Log Analysis

```bash
# View logs for specific service
kubectl logs -f deployment/api-gateway -n ai-coding-platform

# View logs for all pods with label
kubectl logs -f -l app=user-service -n ai-coding-platform

# View previous container logs
kubectl logs <pod-name> -n ai-coding-platform --previous
```

### Performance Debugging

```bash
# Check resource usage
kubectl top pods -n ai-coding-platform
kubectl top nodes

# Check HPA status
kubectl get hpa -n ai-coding-platform
kubectl describe hpa <hpa-name> -n ai-coding-platform
```

## Maintenance

### Regular Maintenance Tasks

1. **Update container images:**
   ```bash
   kubectl set image deployment/api-gateway api-gateway=new-image:tag -n ai-coding-platform
   ```

2. **Database maintenance:**
   ```bash
   # Run database optimization scripts
   kubectl exec -it postgres-0 -n ai-coding-platform -- psql -U postgres -c "VACUUM ANALYZE;"
   ```

3. **Certificate renewal:**
   ```bash
   # Check certificate expiry
   kubectl describe certificate -n ai-coding-platform
   ```

### Capacity Planning

- Monitor resource usage trends
- Plan for traffic growth
- Scale infrastructure proactively
- Review and adjust resource limits regularly

## Support and Documentation

### Additional Resources
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/)

### Emergency Contacts
- DevOps Team: devops@coding-platform.com
- On-call Engineer: oncall@coding-platform.com
- Slack Channel: #production-alerts

---

This deployment guide provides a comprehensive approach to deploying and maintaining the AI Coding Platform in production. Follow the steps carefully and ensure all prerequisites are met before beginning the deployment process.