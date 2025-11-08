#!/bin/bash

# DTekTracking Deployment Script
# Usage: bash scripts/deploy.sh
# This script performs a safe deployment with backup and rollback capability

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        DTekTracking - Automated Deployment                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

PROJECT_DIR="/home/root/webapp/dtektracking"
BACKUP_DIR="/home/root/webapp/backups/dtektracking_$(date +%Y%m%d_%H%M%S)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_info() {
  echo -e "${YELLOW}ℹ${NC} $1"
}

print_header() {
  echo -e "${BLUE}$1${NC}"
}

# Check if running as correct user
if [ "$EUID" -ne 0 ] && [ "$USER" != "root" ]; then 
  print_error "Please run as root or with sudo"
  exit 1
fi

# Navigate to project
cd $PROJECT_DIR || {
  print_error "Project directory not found: $PROJECT_DIR"
  exit 1
}
print_status "Navigated to project directory: $PROJECT_DIR"

# Check if main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  print_error "Not on main branch! Current: $CURRENT_BRANCH"
  echo "Please switch to main branch first: git checkout main"
  exit 1
fi
print_status "On main branch"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  print_error "Uncommitted changes detected!"
  echo "Please commit or stash your changes first:"
  git status --short
  exit 1
fi
print_status "No uncommitted changes"

# Backup current version
print_header "📦 Creating Backup..."
mkdir -p $BACKUP_DIR
if [ -d ".next" ]; then
  cp -r .next $BACKUP_DIR/
  print_status "Backup created: $BACKUP_DIR"
else
  print_info "No .next folder to backup (first deployment?)"
fi

# Save current commit hash for potential rollback
CURRENT_COMMIT=$(git rev-parse HEAD)
echo $CURRENT_COMMIT > $BACKUP_DIR/commit_hash.txt
print_info "Current commit: $CURRENT_COMMIT"

# Pull latest code
print_header "⬇️  Pulling Latest Code..."
git fetch origin main
REMOTE_COMMIT=$(git rev-parse origin/main)
if [ "$CURRENT_COMMIT" = "$REMOTE_COMMIT" ]; then
  print_info "Already up to date!"
else
  git reset --hard origin/main
  print_status "Code updated to latest version"
  git log -1 --pretty=format:"Latest commit: %h - %s (%ar by %an)"
  echo ""
fi

# Install dependencies
print_header "📦 Installing Dependencies..."
if npm ci --production; then
  print_status "Dependencies installed"
else
  print_error "npm ci failed!"
  print_info "Restoring from backup..."
  if [ -d "$BACKUP_DIR/.next" ]; then
    cp -r $BACKUP_DIR/.next .
    git reset --hard $CURRENT_COMMIT
    print_status "Backup restored"
  fi
  exit 1
fi

# Run database connection test
print_header "🧪 Testing Database Connections..."
if npm run test:db > /tmp/db_test.log 2>&1; then
  print_status "Database connections OK"
else
  print_error "Database connection test failed!"
  cat /tmp/db_test.log
  print_info "Deployment aborted - fix database issues first"
  exit 1
fi

# Build application
print_header "🏗️  Building Application..."
BUILD_START=$(date +%s)
if npm run build; then
  BUILD_END=$(date +%s)
  BUILD_TIME=$((BUILD_END - BUILD_START))
  print_status "Build successful (took ${BUILD_TIME}s)"
else
  print_error "Build failed!"
  print_info "Restoring from backup..."
  if [ -d "$BACKUP_DIR/.next" ]; then
    cp -r $BACKUP_DIR/.next .
    git reset --hard $CURRENT_COMMIT
    print_status "Backup restored"
  fi
  exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  print_error "PM2 is not installed!"
  echo "Install with: npm install -g pm2"
  exit 1
fi

# Restart PM2
print_header "🔄 Restarting Application..."
if pm2 describe dtektracking &> /dev/null; then
  # App exists, restart it
  if pm2 restart dtektracking; then
    print_status "Application restarted"
  else
    print_error "PM2 restart failed!"
    pm2 logs dtektracking --lines 20 --nostream
    exit 1
  fi
else
  # App doesn't exist, start it
  if pm2 start npm --name dtektracking -- start; then
    print_status "Application started"
    pm2 save
    print_info "PM2 configuration saved"
  else
    print_error "PM2 start failed!"
    exit 1
  fi
fi

# Wait for application to be ready
print_info "Waiting for application to be ready..."
sleep 5

# Health check
print_header "🏥 Running Health Check..."
if pm2 describe dtektracking | grep -q "online"; then
  print_status "Application is online and healthy"
  
  # Additional health checks
  if curl -f http://localhost:3011/api/admin/health &> /dev/null; then
    print_status "API health endpoint responding"
  else
    print_info "API health endpoint not configured yet"
  fi
else
  print_error "Application is not running!"
  pm2 logs dtektracking --lines 20 --nostream
  exit 1
fi

# Show deployment summary
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  Deployment Summary                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Commit Information:"
git log -1 --pretty=format:"  Hash: %H%n  Author: %an (%ae)%n  Date: %ar%n  Message: %s"
echo ""
echo ""
echo "Backup Location: $BACKUP_DIR"
echo ""
echo "PM2 Status:"
pm2 status dtektracking
echo ""

# Cleanup old backups (keep last 5)
print_header "🧹 Cleaning Old Backups..."
BACKUP_BASE="/home/root/webapp/backups"
if [ -d "$BACKUP_BASE" ]; then
  cd $BACKUP_BASE
  BACKUP_COUNT=$(ls -t | grep dtektracking | wc -l)
  if [ $BACKUP_COUNT -gt 5 ]; then
    REMOVE_COUNT=$((BACKUP_COUNT - 5))
    ls -t | grep dtektracking | tail -n +6 | xargs -r rm -rf
    print_status "Removed $REMOVE_COUNT old backup(s), kept last 5"
  else
    print_info "Only $BACKUP_COUNT backup(s) exist, no cleanup needed"
  fi
fi

# Final success message
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  ✅ Deployment Successful!                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 DTekTracking is now running on the latest version!"
echo ""
echo "Useful commands:"
echo "  - View logs: pm2 logs dtektracking"
echo "  - Restart: pm2 restart dtektracking"
echo "  - Status: pm2 status dtektracking"
echo "  - Rollback: git reset --hard $CURRENT_COMMIT && npm run build && pm2 restart dtektracking"
echo ""
