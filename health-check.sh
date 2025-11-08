#!/bin/bash
#=====================================
# SYSTEM HEALTH CHECK SCRIPT
#=====================================
# Checks all services against SYSTEM_CONFIG.json
# Usage: ./health-check.sh

CONFIG_FILE="/home/root/webapp/SYSTEM_CONFIG.json"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "======================================="
echo "  SYSTEM HEALTH CHECK"
echo "======================================="
echo "Time: $TIMESTAMP"
echo ""

# Function to check port
check_port() {
    local port=$1
    local name=$2
    timeout 2 bash -c "echo > /dev/tcp/localhost/$port" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $name (Port $port): RUNNING${NC}"
        return 0
    else
        echo -e "${RED}❌ $name (Port $port): DOWN${NC}"
        return 1
    fi
}

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local name=$2
    local status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$url" 2>/dev/null)
    if [ "$status" = "200" ] || [ "$status" = "302" ]; then
        echo -e "${GREEN}✅ $name: HTTP $status${NC}"
        return 0
    else
        echo -e "${RED}❌ $name: HTTP $status (FAIL)${NC}"
        return 1
    fi
}

# Service Checks
echo -e "${BLUE}=== SERVICES ===${NC}"
check_port 3001 "Traffic Control"
check_port 5050 "pgAdmin"
check_port 8081 "Redis Commander"
check_port 9001 "FileBrowser"
check_port 61209 "Monitor"

echo ""
echo -e "${BLUE}=== HTTP ENDPOINTS ===${NC}"
check_http "http://localhost:3001" "Traffic Control"
check_http "http://localhost:5050" "pgAdmin"
check_http "http://localhost:8081" "Redis Commander"
check_http "http://localhost:9001" "FileBrowser"
check_http "http://localhost:61209" "Monitor"

echo ""
echo -e "${BLUE}=== PM2 STATUS ===${NC}"
pm2 list | grep -E "(traffic-control|status|online)" | head -5

echo ""
echo -e "${BLUE}=== NGINX STATUS ===${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx: RUNNING${NC}"
    echo "Active sites: $(ls /etc/nginx/sites-enabled/ | wc -l)"
else
    echo -e "${RED}❌ Nginx: NOT RUNNING${NC}"
fi

echo ""
echo -e "${BLUE}=== DOCKER CONTAINERS ===${NC}"
docker ps --format "{{.Names}}: {{.Status}}" | head -5

echo ""
echo -e "${BLUE}=== REDIS STATUS ===${NC}"
if redis-cli -a "DtekRedis2024!" ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis: CONNECTED${NC}"
else
    echo -e "${RED}❌ Redis: NOT CONNECTED${NC}"
fi

echo ""
echo -e "${BLUE}=== SSL CERTIFICATES ===${NC}"
for domain in dtektracking.com postgres.dtektracking.com redis.dtektracking.com dosya.dtektracking.com monitor.dtektracking.com; do
    if [ -f "/etc/letsencrypt/live/$domain/cert.pem" ]; then
        expiry=$(openssl x509 -in "/etc/letsencrypt/live/$domain/cert.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
        echo -e "${GREEN}✅ $domain${NC}: Expires $expiry"
    else
        echo -e "${RED}❌ $domain: NO CERTIFICATE${NC}"
    fi
done

echo ""
echo "======================================="
echo "  HEALTH CHECK COMPLETE"
echo "======================================="
