#!/bin/bash

# Kill existing parser if running
pkill -f "node.*nginx-log-parser"

# Start parser in background
cd /home/root/webapp/traffic-control-system
nohup node scripts/nginx-log-parser.js > /var/log/nginx-parser.log 2>&1 &

echo "Nginx log parser started with PID: $!"
echo "Logs at: /var/log/nginx-parser.log"