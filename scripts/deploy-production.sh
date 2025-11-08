#!/bin/bash

#################################################################################
# Production Deployment Script for Traffic Control System
# 
# Usage: ./deploy-production.sh [options]
# Options:
#   --skip-backup     Skip database backup
#   --skip-tests      Skip running tests
#   --force          Force deployment even if tests fail
#   --rollback       Rollback to previous version
#
# Author: DevOps Team
# Version: 1.0.0
#################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/dtektracking"
BACKUP_DIR="/var/backups/dtektracking"
LOG_FILE="/var/log/deployment_$(date +%Y%m%d_%H%M%S).log"
HEALTH_CHECK_URL="https://dtektracking.com/api/health"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Parse arguments
SKIP_BACKUP=false
SKIP_TESTS=false
FORCE_DEPLOY=false
ROLLBACK=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-backup) SKIP_BACKUP=true ;;
        --skip-tests) SKIP_TESTS=true ;;
        --force) FORCE_DEPLOY=true ;;
        --rollback) ROLLBACK=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    send_slack_notification "❌ Deployment failed: $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

send_slack_notification() {
    if [ ! -z "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$1\"}" \
            $SLACK_WEBHOOK 2>/dev/null || true
    fi
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if running as correct user
    if [ "$USER" != "deploy" ] && [ "$USER" != "root" ]; then
        warning "Running as $USER, recommended to run as 'deploy' user"
    fi
    
    # Check required commands
    for cmd in git npm pm2 psql redis-cli nginx; do
        if ! command -v $cmd &> /dev/null; then
            error "$cmd is not installed"
        fi
    done
    
    # Check disk space
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 80 ]; then
        error "Disk usage is ${DISK_USAGE}%, please free up space"
    fi
    
    log "✓ Prerequisites check passed"
}

backup_database() {
    if [ "$SKIP_BACKUP" = true ]; then
        warning "Skipping database backup (--skip-backup flag)"
        return
    fi
    
    log "Creating database backup..."
    
    mkdir -p $BACKUP_DIR
    BACKUP_FILE="$BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h $DB_HOST \
        -U $DB_USER \
        -d $DB_NAME \
        --no-password \
        --verbose \
        --no-owner \
        --no-acl \
        | gzip > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        log "✓ Database backup created: $BACKUP_FILE"
        
        # Upload to S3 (optional)
        if command -v aws &> /dev/null; then
            aws s3 cp $BACKUP_FILE s3://dtektracking-backups/
            log "✓ Backup uploaded to S3"
        fi
    else
        error "Database backup failed"
    fi
}

run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        warning "Skipping tests (--skip-tests flag)"
        return
    fi
    
    log "Running test suite..."
    
    cd $APP_DIR
    npm test
    
    if [ $? -ne 0 ]; then
        if [ "$FORCE_DEPLOY" = true ]; then
            warning "Tests failed but continuing (--force flag)"
        else
            error "Tests failed. Use --force to deploy anyway"
        fi
    else
        log "✓ All tests passed"
    fi
}

pull_latest_code() {
    log "Pulling latest code..."
    
    cd $APP_DIR
    
    # Save current commit for rollback
    PREVIOUS_COMMIT=$(git rev-parse HEAD)
    echo $PREVIOUS_COMMIT > .last_deploy_commit
    
    # Pull latest changes
    git fetch origin
    git checkout production
    git pull origin production
    
    NEW_COMMIT=$(git rev-parse HEAD)
    
    if [ "$PREVIOUS_COMMIT" = "$NEW_COMMIT" ]; then
        warning "No new changes to deploy"
    else
        log "✓ Updated from $PREVIOUS_COMMIT to $NEW_COMMIT"
    fi
}

install_dependencies() {
    log "Installing dependencies..."
    
    cd $APP_DIR
    
    # Clean install for production
    rm -rf node_modules
    npm ci --production=false  # Need dev deps for build
    
    if [ $? -eq 0 ]; then
        log "✓ Dependencies installed"
    else
        error "Failed to install dependencies"
    fi
}

run_migrations() {
    log "Running database migrations..."
    
    cd $APP_DIR
    NODE_ENV=production node scripts/run-migrations.js
    
    if [ $? -eq 0 ]; then
        log "✓ Migrations completed"
    else
        error "Migration failed"
    fi
}

build_application() {
    log "Building application..."
    
    cd $APP_DIR
    
    # Set production environment
    export NODE_ENV=production
    
    # Run build
    npm run build
    
    if [ $? -eq 0 ]; then
        log "✓ Build completed successfully"
        
        # Check build size
        BUILD_SIZE=$(du -sh .next | awk '{print $1}')
        log "Build size: $BUILD_SIZE"
    else
        error "Build failed"
    fi
}

deploy_application() {
    log "Deploying application..."
    
    cd $APP_DIR
    
    # Reload PM2 with zero-downtime
    pm2 reload ecosystem.config.js --env production
    
    if [ $? -eq 0 ]; then
        log "✓ Application deployed with PM2"
    else
        error "PM2 deployment failed"
    fi
    
    # Clear Redis cache
    redis-cli FLUSHDB
    log "✓ Redis cache cleared"
    
    # Reload Nginx
    sudo nginx -t && sudo nginx -s reload
    log "✓ Nginx reloaded"
}

health_check() {
    log "Running health checks..."
    
    # Wait for app to start
    sleep 10
    
    # Check health endpoint
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL)
    
    if [ "$HTTP_STATUS" = "200" ]; then
        log "✓ Health check passed (HTTP $HTTP_STATUS)"
        
        # Check response content
        HEALTH_RESPONSE=$(curl -s $HEALTH_CHECK_URL)
        echo "Health check response: $HEALTH_RESPONSE" >> $LOG_FILE
        
        # Check if database is healthy
        if echo $HEALTH_RESPONSE | grep -q '"database":"healthy"'; then
            log "✓ Database connection healthy"
        else
            warning "Database connection may have issues"
        fi
        
        # Check if Redis is healthy
        if echo $HEALTH_RESPONSE | grep -q '"redis":"healthy"'; then
            log "✓ Redis connection healthy"
        else
            warning "Redis connection may have issues"
        fi
    else
        error "Health check failed (HTTP $HTTP_STATUS)"
    fi
}

rollback() {
    log "Starting rollback..."
    
    cd $APP_DIR
    
    if [ ! -f .last_deploy_commit ]; then
        error "No previous deployment found"
    fi
    
    PREVIOUS_COMMIT=$(cat .last_deploy_commit)
    log "Rolling back to commit: $PREVIOUS_COMMIT"
    
    # Checkout previous commit
    git checkout $PREVIOUS_COMMIT
    
    # Reinstall dependencies
    npm ci --production=false
    
    # Rebuild
    npm run build
    
    # Restart PM2
    pm2 reload ecosystem.config.js --env production
    
    log "✓ Rollback completed"
    send_slack_notification "🔄 Rollback to $PREVIOUS_COMMIT completed"
}

post_deployment() {
    log "Running post-deployment tasks..."
    
    # Warm up cache
    curl -s $HEALTH_CHECK_URL > /dev/null
    
    # Run security scan (optional)
    if command -v npm audit &> /dev/null; then
        npm audit --production
    fi
    
    # Clean old logs
    find /var/log/dtektracking -name "*.log" -mtime +30 -delete
    
    # Clean old backups (keep last 30)
    ls -t $BACKUP_DIR/*.sql.gz | tail -n +31 | xargs rm -f 2>/dev/null || true
    
    log "✓ Post-deployment tasks completed"
}

# Main execution
main() {
    log "Starting deployment process..."
    send_slack_notification "🚀 Deployment started by $USER"
    
    if [ "$ROLLBACK" = true ]; then
        rollback
        exit 0
    fi
    
    # Run deployment steps
    check_prerequisites
    backup_database
    pull_latest_code
    run_tests
    install_dependencies
    run_migrations
    build_application
    deploy_application
    health_check
    post_deployment
    
    log "🎉 Deployment completed successfully!"
    send_slack_notification "✅ Deployment completed successfully!"
    
    # Show summary
    echo ""
    echo "=========================================="
    echo "Deployment Summary:"
    echo "- Time: $(date)"
    echo "- Commit: $(git rev-parse HEAD)"
    echo "- Branch: $(git branch --show-current)"
    echo "- Build Size: $(du -sh .next | awk '{print $1}')"
    echo "- PM2 Status: $(pm2 status | grep dtektracking)"
    echo "- Log File: $LOG_FILE"
    echo "=========================================="
}

# Run main function
main

exit 0