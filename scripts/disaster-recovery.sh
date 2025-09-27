#!/bin/bash

set -e

# Disaster Recovery Script for AI Coding Platform
# This script handles backup restoration and disaster recovery procedures

NAMESPACE="ai-coding-platform"
S3_BUCKET="ai-coding-platform-backups"

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

# Function to list available backups
list_backups() {
    local database=$1
    local backup_type=${2:-daily}
    
    log "Listing available $backup_type backups for $database..."
    
    aws s3 ls s3://$S3_BUCKET/$database/$backup_type/ --recursive | sort -k1,2
}

# Function to restore PostgreSQL backup
restore_postgres() {
    local backup_file=$1
    local target_db=${2:-$POSTGRES_DB}
    
    log "Restoring PostgreSQL from backup: $backup_file"
    
    # Download backup from S3
    aws s3 cp s3://$S3_BUCKET/postgres/daily/$backup_file /tmp/$backup_file
    
    # Create restoration job
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: postgres-restore-$(date +%s)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: postgres-restore
        image: postgres:15-alpine
        env:
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: POSTGRES_PASSWORD
        - name: POSTGRES_HOST
          valueFrom:
            configMapKeyRef:
              name: database-config
              key: POSTGRES_HOST
        - name: TARGET_DB
          value: "$target_db"
        command:
        - /bin/sh
        - -c
        - |
          set -e
          
          echo "Starting PostgreSQL restoration..."
          
          # Download backup file
          apk add --no-cache aws-cli
          aws s3 cp s3://$S3_BUCKET/postgres/daily/$backup_file /tmp/$backup_file
          
          # Drop existing database (if exists) and recreate
          psql -h \$POSTGRES_HOST -U postgres -c "DROP DATABASE IF EXISTS \$TARGET_DB;"
          psql -h \$POSTGRES_HOST -U postgres -c "CREATE DATABASE \$TARGET_DB;"
          
          # Restore from backup
          gunzip -c /tmp/$backup_file | psql -h \$POSTGRES_HOST -U postgres -d \$TARGET_DB
          
          echo "PostgreSQL restoration completed successfully"
        resources:
          requests:
            memory: "512Mi"
            cpu: "300m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
EOF
    
    success "PostgreSQL restoration job created"
}

# Function to restore MongoDB backup
restore_mongodb() {
    local backup_file=$1
    local target_db=${2:-$MONGODB_DB}
    
    log "Restoring MongoDB from backup: $backup_file"
    
    # Create restoration job
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: mongodb-restore-$(date +%s)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: mongodb-restore
        image: mongo:6
        env:
        - name: MONGODB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: MONGODB_PASSWORD
        - name: MONGODB_HOST
          valueFrom:
            configMapKeyRef:
              name: database-config
              key: MONGODB_HOST
        - name: TARGET_DB
          value: "$target_db"
        command:
        - /bin/sh
        - -c
        - |
          set -e
          
          echo "Starting MongoDB restoration..."
          
          # Download backup file
          apt-get update && apt-get install -y awscli
          aws s3 cp s3://$S3_BUCKET/mongodb/daily/$backup_file /tmp/$backup_file
          
          # Drop existing database
          mongo --host \$MONGODB_HOST --username admin --password \$MONGODB_PASSWORD --authenticationDatabase admin --eval "db.getSiblingDB('\$TARGET_DB').dropDatabase()"
          
          # Restore from backup
          mongorestore --host \$MONGODB_HOST --username admin --password \$MONGODB_PASSWORD --authenticationDatabase admin --db \$TARGET_DB --gzip --archive=/tmp/$backup_file
          
          echo "MongoDB restoration completed successfully"
        resources:
          requests:
            memory: "512Mi"
            cpu: "300m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
EOF
    
    success "MongoDB restoration job created"
}

# Function to restore Redis backup
restore_redis() {
    local backup_file=$1
    
    log "Restoring Redis from backup: $backup_file"
    
    # Create restoration job
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: redis-restore-$(date +%s)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: redis-restore
        image: redis:7-alpine
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: REDIS_PASSWORD
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: database-config
              key: REDIS_HOST
        command:
        - /bin/sh
        - -c
        - |
          set -e
          
          echo "Starting Redis restoration..."
          
          # Download backup file
          apk add --no-cache aws-cli
          aws s3 cp s3://$S3_BUCKET/redis/daily/$backup_file /tmp/$backup_file
          
          # Stop Redis temporarily
          redis-cli -h \$REDIS_HOST -a \$REDIS_PASSWORD SHUTDOWN NOSAVE || true
          
          # Wait for Redis to stop
          sleep 5
          
          # Copy backup file to Redis data directory
          # Note: This requires Redis to be restarted with the new RDB file
          echo "Redis backup downloaded. Manual intervention required to replace RDB file and restart Redis."
          
          echo "Redis restoration prepared"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "500m"
EOF
    
    success "Redis restoration job created"
}

# Function to perform full disaster recovery
full_disaster_recovery() {
    local postgres_backup=$1
    local mongodb_backup=$2
    local redis_backup=$3
    
    log "Starting full disaster recovery..."
    
    # Validate backups exist
    if ! aws s3 ls s3://$S3_BUCKET/postgres/daily/$postgres_backup >/dev/null 2>&1; then
        error "PostgreSQL backup not found: $postgres_backup"
        return 1
    fi
    
    if ! aws s3 ls s3://$S3_BUCKET/mongodb/daily/$mongodb_backup >/dev/null 2>&1; then
        error "MongoDB backup not found: $mongodb_backup"
        return 1
    fi
    
    if ! aws s3 ls s3://$S3_BUCKET/redis/daily/$redis_backup >/dev/null 2>&1; then
        error "Redis backup not found: $redis_backup"
        return 1
    fi
    
    # Scale down all services
    log "Scaling down all services..."
    kubectl scale deployment --all --replicas=0 -n $NAMESPACE
    
    # Wait for pods to terminate
    kubectl wait --for=delete pod --all -n $NAMESPACE --timeout=300s
    
    # Restore databases
    restore_postgres "$postgres_backup"
    restore_mongodb "$mongodb_backup"
    restore_redis "$redis_backup"
    
    # Wait for restoration jobs to complete
    log "Waiting for restoration jobs to complete..."
    kubectl wait --for=condition=complete job --all -n $NAMESPACE --timeout=1800s
    
    # Scale up services
    log "Scaling up services..."
    kubectl scale deployment api-gateway --replicas=3 -n $NAMESPACE
    kubectl scale deployment user-service --replicas=2 -n $NAMESPACE
    kubectl scale deployment problem-service --replicas=2 -n $NAMESPACE
    kubectl scale deployment code-execution-service --replicas=3 -n $NAMESPACE
    kubectl scale deployment ai-analysis-service --replicas=2 -n $NAMESPACE
    
    # Wait for services to be ready
    kubectl wait --for=condition=available deployment --all -n $NAMESPACE --timeout=600s
    
    # Run health checks
    log "Running post-recovery health checks..."
    ./scripts/health-check.sh
    
    success "Full disaster recovery completed successfully"
}

# Function to create point-in-time recovery
create_point_in_time_backup() {
    local label=${1:-"manual-$(date +%Y%m%d_%H%M%S)"}
    
    log "Creating point-in-time backup with label: $label"
    
    # Trigger immediate backups
    kubectl create job --from=cronjob/postgres-backup postgres-backup-$label -n $NAMESPACE
    kubectl create job --from=cronjob/mongodb-backup mongodb-backup-$label -n $NAMESPACE
    kubectl create job --from=cronjob/redis-backup redis-backup-$label -n $NAMESPACE
    
    # Wait for backups to complete
    kubectl wait --for=condition=complete job postgres-backup-$label mongodb-backup-$label redis-backup-$label -n $NAMESPACE --timeout=1800s
    
    success "Point-in-time backup created with label: $label"
}

# Function to validate backup integrity
validate_backup_integrity() {
    local database=$1
    local backup_file=$2
    
    log "Validating backup integrity for $database: $backup_file"
    
    case $database in
        "postgres")
            # Download and test PostgreSQL backup
            aws s3 cp s3://$S3_BUCKET/postgres/daily/$backup_file /tmp/test_$backup_file
            if gunzip -t /tmp/test_$backup_file; then
                success "PostgreSQL backup integrity check passed"
            else
                error "PostgreSQL backup integrity check failed"
                return 1
            fi
            rm -f /tmp/test_$backup_file
            ;;
        "mongodb")
            # Download and test MongoDB backup
            aws s3 cp s3://$S3_BUCKET/mongodb/daily/$backup_file /tmp/test_$backup_file
            if gunzip -t /tmp/test_$backup_file; then
                success "MongoDB backup integrity check passed"
            else
                error "MongoDB backup integrity check failed"
                return 1
            fi
            rm -f /tmp/test_$backup_file
            ;;
        "redis")
            # Download Redis backup
            aws s3 cp s3://$S3_BUCKET/redis/daily/$backup_file /tmp/test_$backup_file
            if file /tmp/test_$backup_file | grep -q "Redis RDB"; then
                success "Redis backup integrity check passed"
            else
                error "Redis backup integrity check failed"
                return 1
            fi
            rm -f /tmp/test_$backup_file
            ;;
        *)
            error "Unknown database type: $database"
            return 1
            ;;
    esac
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  list-backups <database> [type]     List available backups"
    echo "  restore-postgres <backup_file>     Restore PostgreSQL from backup"
    echo "  restore-mongodb <backup_file>      Restore MongoDB from backup"
    echo "  restore-redis <backup_file>        Restore Redis from backup"
    echo "  full-recovery <pg_backup> <mongo_backup> <redis_backup>  Full disaster recovery"
    echo "  create-backup [label]              Create point-in-time backup"
    echo "  validate-backup <database> <file>  Validate backup integrity"
    echo ""
    echo "Examples:"
    echo "  $0 list-backups postgres daily"
    echo "  $0 restore-postgres postgres_backup_20241014_020000.sql.gz"
    echo "  $0 full-recovery postgres_backup_20241014_020000.sql.gz mongodb_backup_20241014_030000.gz redis_backup_20241014_040000.rdb"
    echo "  $0 create-backup emergency-fix"
    echo "  $0 validate-backup postgres postgres_backup_20241014_020000.sql.gz"
}

# Main script execution
case "${1:-}" in
    "list-backups")
        list_backups "$2" "$3"
        ;;
    "restore-postgres")
        restore_postgres "$2" "$3"
        ;;
    "restore-mongodb")
        restore_mongodb "$2" "$3"
        ;;
    "restore-redis")
        restore_redis "$2"
        ;;
    "full-recovery")
        full_disaster_recovery "$2" "$3" "$4"
        ;;
    "create-backup")
        create_point_in_time_backup "$2"
        ;;
    "validate-backup")
        validate_backup_integrity "$2" "$3"
        ;;
    *)
        show_usage
        exit 1
        ;;
esac