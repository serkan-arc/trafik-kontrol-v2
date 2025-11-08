#!/usr/bin/env python3
import psutil
import json
import time
from flask import Flask, jsonify, render_template_string
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

HTML_TEMPLATE = '''
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistem Monitörü - DTek Tracking</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header-container {
            text-align: center;
            margin-bottom: 30px;
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        h1 {
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            margin: 0;
        }
        .subtitle {
            color: #fbbf24;
            font-size: 1.1em;
            margin-top: 10px;
        }
        .brand {
            display: inline-block;
            background: linear-gradient(90deg, #fbbf24, #f59e0b);
            color: #1f2937;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
            margin-top: 10px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            border: 1px solid rgba(255,255,255,0.2);
            transition: transform 0.3s;
        }
        .card:hover {
            transform: translateY(-5px);
        }
        .card h2 {
            margin-bottom: 20px;
            font-size: 1.4em;
            color: #fbbf24;
            border-bottom: 2px solid rgba(251, 191, 36, 0.3);
            padding-bottom: 10px;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 10px;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
        }
        .metric-label {
            font-weight: 600;
        }
        .metric-value {
            font-family: 'Courier New', monospace;
            color: #86efac;
            font-weight: bold;
        }
        .quick-links {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
        }
        .quick-link {
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            text-decoration: none;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .quick-link:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: rgba(0,0,0,0.3);
            border-radius: 10px;
            overflow: hidden;
            margin-top: 5px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4ade80, #22c55e);
            transition: width 0.5s ease;
        }
        .status-online {
            color: #4ade80;
        }
        .status-warning {
            color: #fbbf24;
        }
        .status-critical {
            color: #f87171;
        }
        .timestamp {
            text-align: center;
            margin-top: 30px;
            opacity: 0.7;
        }
    </style>
    <script>
        async function updateStats() {
            try {
                const response = await fetch('/api/stats');
                const data = await response.json();
                
                // CPU
                document.getElementById('cpu-percent').textContent = data.cpu.percent + '%';
                document.getElementById('cpu-bar').style.width = data.cpu.percent + '%';
                document.getElementById('cpu-cores').textContent = data.cpu.cores;
                document.getElementById('cpu-freq').textContent = data.cpu.frequency + ' MHz';
                
                // Memory
                document.getElementById('mem-percent').textContent = data.memory.percent + '%';
                document.getElementById('mem-bar').style.width = data.memory.percent + '%';
                document.getElementById('mem-used').textContent = data.memory.used_gb + ' GB';
                document.getElementById('mem-total').textContent = data.memory.total_gb + ' GB';
                
                // Disk
                document.getElementById('disk-percent').textContent = data.disk.percent + '%';
                document.getElementById('disk-bar').style.width = data.disk.percent + '%';
                document.getElementById('disk-used').textContent = data.disk.used_gb + ' GB';
                document.getElementById('disk-total').textContent = data.disk.total_gb + ' GB';
                
                // Network
                document.getElementById('net-sent').textContent = data.network.sent_mb + ' MB';
                document.getElementById('net-recv').textContent = data.network.received_mb + ' MB';
                
                // System
                document.getElementById('uptime').textContent = data.system.uptime;
                document.getElementById('load-avg').textContent = data.system.load_average.join(', ');
                document.getElementById('processes').textContent = data.system.processes;
                
                // Update timestamp
                document.getElementById('timestamp').textContent = new Date().toLocaleString('tr-TR');
                
                // Color code based on usage
                colorCode('cpu-bar', data.cpu.percent);
                colorCode('mem-bar', data.memory.percent);
                colorCode('disk-bar', data.disk.percent);
                
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        }
        
        function colorCode(elementId, percent) {
            const element = document.getElementById(elementId);
            if (percent > 80) {
                element.style.background = 'linear-gradient(90deg, #f87171, #dc2626)';
            } else if (percent > 60) {
                element.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
            } else {
                element.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
            }
        }
        
        // Update every 2 seconds
        setInterval(updateStats, 2000);
        updateStats();
    </script>
</head>
<body>
    <div class="quick-links">
        <a href="http://207.180.204.60:3001/dashboard" class="quick-link">
            <span>🏠</span>
            <span>Ana Panel</span>
        </a>
        <a href="https://postgres.dtektracking.com" class="quick-link" target="_blank">
            <span>🗄️</span>
            <span>pgAdmin</span>
        </a>
        <a href="https://redis.dtektracking.com" class="quick-link" target="_blank">
            <span>📦</span>
            <span>Redis</span>
        </a>
    </div>
    <div class="container">
        <div class="header-container">
            <h1>🖥️ Sistem Monitörü</h1>
            <div class="subtitle">Gerçek Zamanlı Sistem Performans Takibi</div>
            <div class="brand">DTek Tracking System</div>
        </div>
        
        <div class="grid">
            <!-- CPU Card -->
            <div class="card">
                <h2>💻 CPU</h2>
                <div class="metric">
                    <span class="metric-label">Kullanım:</span>
                    <span class="metric-value" id="cpu-percent">--%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="cpu-bar" style="width: 0%"></div>
                </div>
                <div class="metric">
                    <span class="metric-label">Çekirdek:</span>
                    <span class="metric-value" id="cpu-cores">--</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Frekans:</span>
                    <span class="metric-value" id="cpu-freq">-- MHz</span>
                </div>
            </div>
            
            <!-- Memory Card -->
            <div class="card">
                <h2>🧠 Bellek (RAM)</h2>
                <div class="metric">
                    <span class="metric-label">Kullanım:</span>
                    <span class="metric-value" id="mem-percent">--%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="mem-bar" style="width: 0%"></div>
                </div>
                <div class="metric">
                    <span class="metric-label">Kullanılan:</span>
                    <span class="metric-value" id="mem-used">-- GB</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Toplam:</span>
                    <span class="metric-value" id="mem-total">-- GB</span>
                </div>
            </div>
            
            <!-- Disk Card -->
            <div class="card">
                <h2>💾 Disk</h2>
                <div class="metric">
                    <span class="metric-label">Kullanım:</span>
                    <span class="metric-value" id="disk-percent">--%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="disk-bar" style="width: 0%"></div>
                </div>
                <div class="metric">
                    <span class="metric-label">Kullanılan:</span>
                    <span class="metric-value" id="disk-used">-- GB</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Toplam:</span>
                    <span class="metric-value" id="disk-total">-- GB</span>
                </div>
            </div>
            
            <!-- Network Card -->
            <div class="card">
                <h2>🌐 Ağ</h2>
                <div class="metric">
                    <span class="metric-label">Gönderilen:</span>
                    <span class="metric-value" id="net-sent">-- MB</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Alınan:</span>
                    <span class="metric-value" id="net-recv">-- MB</span>
                </div>
            </div>
            
            <!-- System Card -->
            <div class="card">
                <h2>⚙️ Sistem</h2>
                <div class="metric">
                    <span class="metric-label">Çalışma Süresi:</span>
                    <span class="metric-value" id="uptime">--</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Yük Ortalaması:</span>
                    <span class="metric-value" id="load-avg">--, --, --</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Toplam İşlem:</span>
                    <span class="metric-value" id="processes">--</span>
                </div>
            </div>
        </div>
        
        <div class="timestamp">
            Son Güncelleme: <span id="timestamp">--</span>
        </div>
    </div>
</body>
</html>
'''

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/stats')
def get_stats():
    # CPU
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_count = psutil.cpu_count()
    cpu_freq = psutil.cpu_freq()
    
    # Memory
    memory = psutil.virtual_memory()
    
    # Disk
    disk = psutil.disk_usage('/')
    
    # Network
    net = psutil.net_io_counters()
    
    # System info
    boot_time = psutil.boot_time()
    uptime_seconds = time.time() - boot_time
    hours = int(uptime_seconds // 3600)
    minutes = int((uptime_seconds % 3600) // 60)
    
    # Process count
    process_count = len(psutil.pids())
    
    # Load average
    load_avg = psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
    
    return jsonify({
        'cpu': {
            'percent': round(cpu_percent, 1),
            'cores': cpu_count,
            'frequency': round(cpu_freq.current if cpu_freq else 0, 0)
        },
        'memory': {
            'percent': round(memory.percent, 1),
            'used_gb': round(memory.used / (1024**3), 1),
            'total_gb': round(memory.total / (1024**3), 1),
            'available_gb': round(memory.available / (1024**3), 1)
        },
        'disk': {
            'percent': round(disk.percent, 1),
            'used_gb': round(disk.used / (1024**3), 1),
            'total_gb': round(disk.total / (1024**3), 1),
            'free_gb': round(disk.free / (1024**3), 1)
        },
        'network': {
            'sent_mb': round(net.bytes_sent / (1024**2), 1),
            'received_mb': round(net.bytes_recv / (1024**2), 1)
        },
        'system': {
            'uptime': f'{hours} saat {minutes} dakika',
            'load_average': [round(x, 2) for x in load_avg],
            'processes': process_count,
            'timestamp': datetime.now().isoformat()
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=61209, debug=False)