#!/bin/bash

# Enhanced Nginx Log Parser V2 Startup Script

echo "🚀 Starting Enhanced Nginx Log Parser V2..."

# Kill existing parser if running
echo "🔍 Checking for existing parser processes..."
pkill -f "node.*nginx-log-parser"
sleep 2

# Change to project directory
cd /home/root/webapp/traffic-control-system || exit 1

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    exit 1
fi

# Check if script exists
if [ ! -f "scripts/nginx-log-parser-v2.js" ]; then
    echo "❌ Parser script not found!"
    exit 1
fi

# Make script executable
chmod +x scripts/nginx-log-parser-v2.js

# Create log directory if not exists
mkdir -p /var/log/traffic-control

# Start parser in background
echo "▶️  Starting parser in background..."
nohup node scripts/nginx-log-parser-v2.js > /var/log/traffic-control/nginx-parser.log 2>&1 &
PARSER_PID=$!

# Wait a moment and check if it's running
sleep 2
if ps -p $PARSER_PID > /dev/null; then
    echo "✅ Nginx log parser started successfully!"
    echo "📊 PID: $PARSER_PID"
    echo "📝 Logs: /var/log/traffic-control/nginx-parser.log"
    echo ""
    echo "To view logs:"
    echo "  tail -f /var/log/traffic-control/nginx-parser.log"
    echo ""
    echo "To stop parser:"
    echo "  pkill -f 'node.*nginx-log-parser-v2'"
else
    echo "❌ Failed to start parser!"
    echo "Check logs at: /var/log/traffic-control/nginx-parser.log"
    exit 1
fi
