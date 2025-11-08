#!/usr/bin/env python3
import psutil
import json
import time
import psycopg2
from flask import Flask, jsonify, render_template_string
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# Database configuration from environment
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'postgres.dtekai.com'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME', 'dtektracking'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s')
}

HTML_TEMPLATE = '''
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistem İzleme Paneli - DTek Tracking</title>
    <style>
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
            background: #f8f9fa;
            color: #1f2937;
            min-height: 100vh;
        }
        
        /* Header */
        .header {
            background: #ffffff;
            border-bottom: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .header-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .logo {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #4f46e5, #6366f1);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
        }
        
        .brand-name {
            font-size: 1.5em;
            font-weight: 600;
            color: #1f2937;
        }
        
        .brand-subtitle {
            font-size: 0.85em;
            color: #6b7280;
            margin-top: 2px;
        }
        
        .nav-links {
            display: flex;
            gap: 10px;
        }
        
        .nav-link {
            padding: 8px 16px;
            background: #f3f4f6;
            color: #4b5563;
            text-decoration: none;
            border-radius: 8px;
            font-size: 0.9em;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .nav-link:hover {
            background: #e5e7eb;
            color: #1f2937;
        }
        
        .nav-link.primary {
            background: #4f46e5;
            color: white;
        }
        
        .nav-link.primary:hover {
            background: #4338ca;
        }
        
        /* Container */
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 30px;
        }
        
        /* Stats Overview */
        .stats-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #e5e7eb;
            transition: all 0.2s;
        }
        
        .stat-card:hover {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
            transform: translateY(-2px);
        }
        
        .stat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .stat-title {
            font-size: 0.9em;
            color: #6b7280;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stat-icon {
            width: 35px;
            height: 35px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        
        .stat-icon.cpu { background: #eef2ff; }
        .stat-icon.memory { background: #fef3c7; }
        .stat-icon.disk { background: #ecfdf5; }
        .stat-icon.network { background: #fce7f3; }
        
        .stat-value {
            font-size: 2em;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 10px;
        }
        
        .stat-change {
            font-size: 0.85em;
            color: #6b7280;
        }
        
        /* Detailed Cards */
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 25px;
        }
        
        .card {
            background: white;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            overflow: hidden;
        }
        
        .card-header {
            background: #f9fafb;
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .card-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            background: white;
            border: 1px solid #e5e7eb;
        }
        
        .card-title {
            font-size: 1.1em;
            font-weight: 600;
            color: #1f2937;
        }
        
        .card-body {
            padding: 20px;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            font-size: 0.9em;
            color: #6b7280;
        }
        
        .metric-value {
            font-size: 0.95em;
            font-weight: 600;
            color: #1f2937;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
        }
        
        /* Progress Bar */
        .progress-container {
            margin-top: 8px;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #f3f4f6;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: #4f46e5;
            transition: width 0.5s ease;
            border-radius: 4px;
        }
        
        .progress-fill.warning {
            background: #f59e0b;
        }
        
        .progress-fill.danger {
            background: #ef4444;
        }
        
        /* Status Badge */
        .status-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        
        .status-badge.success {
            background: #d1fae5;
            color: #065f46;
        }
        
        .status-badge.warning {
            background: #fed7aa;
            color: #92400e;
        }
        
        .status-badge.danger {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        /* Footer */
        .footer {
            margin-top: 50px;
            padding: 20px;
            text-align: center;
            color: #9ca3af;
            font-size: 0.85em;
        }
        
        .timestamp {
            font-weight: 600;
            color: #6b7280;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 15px;
            }
            
            .nav-links {
                width: 100%;
                justify-content: center;
            }
            
            .container {
                padding: 20px;
            }
            
            .stats-overview {
                grid-template-columns: 1fr;
            }
            
            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
    <script>
        async function updateSystemConfig() {
            try {
                const response = await fetch('/api/system-config');
                const data = await response.json();
                
                // Update system info card
                const systemCard = document.getElementById('system-services');
                if (systemCard && data.services) {
                    let servicesHtml = '';
                    Object.entries(data.services).forEach(([name, service]) => {
                        const statusColor = service.ssl ? '#10b981' : '#f59e0b';
                        servicesHtml += `
                            <div class="metric">
                                <span class="metric-label">
                                    ${name} 
                                    ${service.ssl ? '<span style="color: #10b981;">🔒</span>' : ''}
                                </span>
                                <span class="metric-value" style="font-size: 0.8em;">${service.domain || 'N/A'}</span>
                            </div>
                        `;
                    });
                    systemCard.innerHTML = servicesHtml;
                }
                
            } catch (error) {
                console.error('Error fetching system config:', error);
            }
        }
        
        async function updateNotifications() {
            try {
                const response = await fetch('/api/notifications');
                const data = await response.json();
                
                // Overview
                document.getElementById('notif-overview').textContent = data.stats_24h.success_rate + '%';
                
                // Detailed stats
                document.getElementById('notif-success-rate').textContent = data.stats_24h.success_rate + '%';
                document.getElementById('notif-bar').style.width = data.stats_24h.success_rate + '%';
                document.getElementById('notif-sent').textContent = data.stats_24h.sent;
                document.getElementById('notif-failed').textContent = data.stats_24h.failed;
                document.getElementById('notif-rules').textContent = data.config.active_rules;
                
                // Update status badge
                const successRate = data.stats_24h.success_rate;
                const statusBadge = document.getElementById('notif-status');
                if (successRate < 80) {
                    statusBadge.className = 'status-badge danger';
                    statusBadge.innerHTML = '<span class="status-dot"></span>Kritik';
                } else if (successRate < 95) {
                    statusBadge.className = 'status-badge warning';
                    statusBadge.innerHTML = '<span class="status-dot"></span>Uyarı';
                } else {
                    statusBadge.className = 'status-badge success';
                    statusBadge.innerHTML = '<span class="status-dot"></span>Normal';
                }
                
                // Update failed notifications list
                const failedDiv = document.getElementById('failed-notifications');
                if (data.recent_failures.length === 0) {
                    failedDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #10b981;">✅ Son 24 saatte başarısız bildirim yok</div>';
                } else {
                    failedDiv.innerHTML = data.recent_failures.map(f => `
                        <div class="metric" style="flex-direction: column; align-items: flex-start; border-bottom: 1px solid #f3f4f6; padding: 15px 0;">
                            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 8px;">
                                <span style="font-weight: 600; color: #ef4444;">${f.event_type || 'N/A'}</span>
                                <span class="status-badge danger" style="font-size: 0.75em;">${f.severity || 'N/A'}</span>
                            </div>
                            <div style="font-size: 0.85em; color: #6b7280; margin-bottom: 4px;">
                                📧 ${f.recipient || 'N/A'}
                            </div>
                            <div style="font-size: 0.8em; color: #ef4444; background: #fef2f2; padding: 6px 10px; border-radius: 6px; width: 100%;">
                                ${f.error || 'Hata mesajı yok'}
                            </div>
                            <div style="font-size: 0.75em; color: #9ca3af; margin-top: 6px;">
                                🕐 ${new Date(f.timestamp).toLocaleString('tr-TR')}
                            </div>
                        </div>
                    `).join('');
                }
                
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        }
        
        async function updateStats() {
            try {
                const response = await fetch('/api/stats');
                const data = await response.json();
                
                // Overview cards
                document.getElementById('cpu-overview').textContent = data.cpu.percent + '%';
                document.getElementById('mem-overview').textContent = data.memory.percent + '%';
                document.getElementById('disk-overview').textContent = data.disk.percent + '%';
                
                // CPU Details
                document.getElementById('cpu-percent').textContent = data.cpu.percent + '%';
                document.getElementById('cpu-bar').style.width = data.cpu.percent + '%';
                document.getElementById('cpu-cores').textContent = data.cpu.cores;
                document.getElementById('cpu-freq').textContent = data.cpu.frequency + ' MHz';
                
                // Memory Details
                document.getElementById('mem-percent').textContent = data.memory.percent + '%';
                document.getElementById('mem-bar').style.width = data.memory.percent + '%';
                document.getElementById('mem-used').textContent = data.memory.used_gb + ' GB';
                document.getElementById('mem-total').textContent = data.memory.total_gb + ' GB';
                document.getElementById('mem-available').textContent = data.memory.available_gb + ' GB';
                
                // Disk Details
                document.getElementById('disk-percent').textContent = data.disk.percent + '%';
                document.getElementById('disk-bar').style.width = data.disk.percent + '%';
                document.getElementById('disk-used').textContent = data.disk.used_gb + ' GB';
                document.getElementById('disk-total').textContent = data.disk.total_gb + ' GB';
                document.getElementById('disk-free').textContent = data.disk.free_gb + ' GB';
                
                // Network Details
                document.getElementById('net-sent').textContent = data.network.sent_mb + ' MB';
                document.getElementById('net-recv').textContent = data.network.received_mb + ' MB';
                
                // System Details
                document.getElementById('uptime').textContent = data.system.uptime;
                document.getElementById('load-avg').textContent = data.system.load_average.join(', ');
                document.getElementById('processes').textContent = data.system.processes;
                
                // Update timestamp
                document.getElementById('timestamp').textContent = new Date().toLocaleString('tr-TR');
                
                // Update progress bar colors
                updateProgressColor('cpu-bar', data.cpu.percent);
                updateProgressColor('mem-bar', data.memory.percent);
                updateProgressColor('disk-bar', data.disk.percent);
                
                // Update status badges
                updateStatusBadge('cpu-status', data.cpu.percent);
                updateStatusBadge('mem-status', data.memory.percent);
                updateStatusBadge('disk-status', data.disk.percent);
                
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        }
        
        function updateProgressColor(elementId, percent) {
            const element = document.getElementById(elementId);
            element.className = 'progress-fill';
            if (percent > 80) {
                element.classList.add('danger');
            } else if (percent > 60) {
                element.classList.add('warning');
            }
        }
        
        function updateStatusBadge(elementId, percent) {
            const element = document.getElementById(elementId);
            if (percent > 80) {
                element.className = 'status-badge danger';
                element.innerHTML = '<span class="status-dot"></span>Kritik';
            } else if (percent > 60) {
                element.className = 'status-badge warning';
                element.innerHTML = '<span class="status-dot"></span>Uyarı';
            } else {
                element.className = 'status-badge success';
                element.innerHTML = '<span class="status-dot"></span>Normal';
            }
        }
        
        // Update every 2 seconds
        setInterval(updateStats, 2000);
        setInterval(updateNotifications, 5000); // Update notifications every 5 seconds
        setInterval(updateSystemConfig, 10000); // Update system config every 10 seconds
        updateStats();
        updateNotifications();
        updateSystemConfig();
    </script>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-content">
            <div class="logo-section">
                <div class="logo">📊</div>
                <div>
                    <div class="brand-name">Sistem İzleme Paneli</div>
                    <div class="brand-subtitle">DTek Tracking System</div>
                </div>
            </div>
            <div class="nav-links">
                <a href="https://dtektracking.com/dashboard" class="nav-link primary" target="_blank">
                    <span>🏠</span>
                    <span>Ana Panel</span>
                </a>
                <a href="https://dosya.dtektracking.com" class="nav-link" target="_blank">
                    <span>📁</span>
                    <span>Dosyalar</span>
                </a>
                <a href="https://postgres.dtektracking.com" class="nav-link" target="_blank">
                    <span>🗄️</span>
                    <span>Veritabanı</span>
                </a>
                <a href="https://redis.dtektracking.com" class="nav-link" target="_blank">
                    <span>📦</span>
                    <span>Cache</span>
                </a>
            </div>
        </div>
    </div>
    
    <div class="container">
        <!-- Stats Overview -->
        <div class="stats-overview">
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">CPU Kullanımı</div>
                    <div class="stat-icon cpu">💻</div>
                </div>
                <div class="stat-value" id="cpu-overview">--%</div>
                <div class="stat-change">İşlemci performansı</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">Bellek Kullanımı</div>
                    <div class="stat-icon memory">🧠</div>
                </div>
                <div class="stat-value" id="mem-overview">--%</div>
                <div class="stat-change">RAM durumu</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">Disk Kullanımı</div>
                    <div class="stat-icon disk">💾</div>
                </div>
                <div class="stat-value" id="disk-overview">--%</div>
                <div class="stat-change">Depolama alanı</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">Bildirim Başarısı</div>
                    <div class="stat-icon network" style="background: #ede9fe;">🔔</div>
                </div>
                <div class="stat-value" id="notif-overview">--%</div>
                <div class="stat-change">Son 24 saat</div>
            </div>
        </div>
        
        <!-- Detailed Cards -->
        <div class="grid">
            <!-- CPU Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">💻</div>
                    <div class="card-title">İşlemci (CPU)</div>
                    <span class="status-badge success" id="cpu-status">
                        <span class="status-dot"></span>Normal
                    </span>
                </div>
                <div class="card-body">
                    <div class="metric">
                        <span class="metric-label">Kullanım Oranı</span>
                        <span class="metric-value" id="cpu-percent">--%</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="cpu-bar" style="width: 0%"></div>
                        </div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Çekirdek Sayısı</span>
                        <span class="metric-value" id="cpu-cores">--</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">İşlemci Hızı</span>
                        <span class="metric-value" id="cpu-freq">-- MHz</span>
                    </div>
                </div>
            </div>
            
            <!-- Memory Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">🧠</div>
                    <div class="card-title">Bellek (RAM)</div>
                    <span class="status-badge success" id="mem-status">
                        <span class="status-dot"></span>Normal
                    </span>
                </div>
                <div class="card-body">
                    <div class="metric">
                        <span class="metric-label">Kullanım Oranı</span>
                        <span class="metric-value" id="mem-percent">--%</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="mem-bar" style="width: 0%"></div>
                        </div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Kullanılan</span>
                        <span class="metric-value" id="mem-used">-- GB</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Toplam</span>
                        <span class="metric-value" id="mem-total">-- GB</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Kullanılabilir</span>
                        <span class="metric-value" id="mem-available">-- GB</span>
                    </div>
                </div>
            </div>
            
            <!-- Disk Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">💾</div>
                    <div class="card-title">Disk Alanı</div>
                    <span class="status-badge success" id="disk-status">
                        <span class="status-dot"></span>Normal
                    </span>
                </div>
                <div class="card-body">
                    <div class="metric">
                        <span class="metric-label">Kullanım Oranı</span>
                        <span class="metric-value" id="disk-percent">--%</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="disk-bar" style="width: 0%"></div>
                        </div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Kullanılan</span>
                        <span class="metric-value" id="disk-used">-- GB</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Toplam</span>
                        <span class="metric-value" id="disk-total">-- GB</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Boş Alan</span>
                        <span class="metric-value" id="disk-free">-- GB</span>
                    </div>
                </div>
            </div>
            
            <!-- Network Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">🌐</div>
                    <div class="card-title">Ağ Trafiği</div>
                </div>
                <div class="card-body">
                    <div class="metric">
                        <span class="metric-label">Gönderilen Veri</span>
                        <span class="metric-value" id="net-sent">-- MB</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Alınan Veri</span>
                        <span class="metric-value" id="net-recv">-- MB</span>
                    </div>
                </div>
            </div>
            
            <!-- System Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">⚙️</div>
                    <div class="card-title">Sistem Bilgileri</div>
                </div>
                <div class="card-body">
                    <div class="metric">
                        <span class="metric-label">Çalışma Süresi</span>
                        <span class="metric-value" id="uptime">--</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Yük Ortalaması</span>
                        <span class="metric-value" id="load-avg">--, --, --</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Toplam İşlem</span>
                        <span class="metric-value" id="processes">--</span>
                    </div>
                </div>
            </div>
            
            <!-- Services Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">🌐</div>
                    <div class="card-title">Aktif Servisler</div>
                </div>
                <div class="card-body" id="system-services">
                    <div style="text-align: center; padding: 20px; color: #9ca3af;">
                        Yükleniyor...
                    </div>
                </div>
            </div>
            
            <!-- Notification Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">🔔</div>
                    <div class="card-title">Bildirim Sistemi</div>
                    <span class="status-badge success" id="notif-status">
                        <span class="status-dot"></span>Normal
                    </span>
                </div>
                <div class="card-body">
                    <div class="metric">
                        <span class="metric-label">Başarı Oranı (24s)</span>
                        <span class="metric-value" id="notif-success-rate">--%</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="notif-bar" style="width: 0%"></div>
                        </div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Gönderilen</span>
                        <span class="metric-value" style="color: #10b981;" id="notif-sent">--</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Başarısız</span>
                        <span class="metric-value" style="color: #ef4444;" id="notif-failed">--</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Aktif Kurallar</span>
                        <span class="metric-value" id="notif-rules">--</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Failed Notifications Section -->
        <div style="margin-top: 30px;">
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">⚠️</div>
                    <div class="card-title">Son Başarısız Bildirimler</div>
                </div>
                <div class="card-body" id="failed-notifications">
                    <div style="text-align: center; padding: 20px; color: #9ca3af;">
                        Yükleniyor...
                    </div>
                </div>
            </div>
        </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            Son Güncelleme: <span class="timestamp" id="timestamp">--</span><br>
            DTek Tracking System © 2024
        </div>
    </div>
</body>
</html>
'''

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/notifications')
def get_notifications():
    """Get notification statistics from database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Get notification statistics (last 24 hours)
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'throttled' THEN 1 END) as throttled
            FROM notification_history
            WHERE created_at > NOW() - INTERVAL '24 hours'
        """)
        stats_24h = cur.fetchone()
        
        # Get recent failed notifications
        cur.execute("""
            SELECT 
                event_type,
                severity,
                recipient,
                error_message,
                created_at
            FROM notification_history
            WHERE status = 'failed'
            AND created_at > NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC
            LIMIT 10
        """)
        recent_failures = cur.fetchall()
        
        # Get success rate (last 7 days)
        cur.execute("""
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent
            FROM notification_history
            WHERE created_at > NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        """)
        weekly_stats = cur.fetchall()
        
        # Get active rules count
        cur.execute("SELECT COUNT(*) FROM notification_rules WHERE enabled = true")
        active_rules = cur.fetchone()[0]
        
        # Get active channels count
        cur.execute("SELECT COUNT(*) FROM notification_channels WHERE enabled = true")
        active_channels = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        # Calculate success rate
        total_24h = stats_24h[0] or 0
        sent_24h = stats_24h[1] or 0
        success_rate = round((sent_24h / total_24h * 100), 1) if total_24h > 0 else 100.0
        
        return jsonify({
            'stats_24h': {
                'total': total_24h,
                'sent': stats_24h[1] or 0,
                'failed': stats_24h[2] or 0,
                'pending': stats_24h[3] or 0,
                'throttled': stats_24h[4] or 0,
                'success_rate': success_rate
            },
            'recent_failures': [
                {
                    'event_type': f[0],
                    'severity': f[1],
                    'recipient': f[2],
                    'error': f[3],
                    'timestamp': f[4].isoformat() if f[4] else None
                } for f in recent_failures
            ],
            'weekly_stats': [
                {
                    'date': w[0].isoformat() if w[0] else None,
                    'total': w[1],
                    'sent': w[2],
                    'rate': round((w[2] / w[1] * 100), 1) if w[1] > 0 else 0
                } for w in weekly_stats
            ],
            'config': {
                'active_rules': active_rules,
                'active_channels': active_channels
            }
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'stats_24h': {
                'total': 0,
                'sent': 0,
                'failed': 0,
                'pending': 0,
                'throttled': 0,
                'success_rate': 0
            },
            'recent_failures': [],
            'weekly_stats': [],
            'config': {
                'active_rules': 0,
                'active_channels': 0
            }
        })

@app.route('/api/system-config')
def get_system_config():
    """Get system configuration from SYSTEM_CONFIG.json"""
    try:
        config_path = '/home/root/webapp/SYSTEM_CONFIG.json'
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config_data = json.load(f)
                return jsonify(config_data)
        else:
            return jsonify({
                'error': 'SYSTEM_CONFIG.json not found',
                'services': {},
                'removed_services': {}
            })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'services': {},
            'removed_services': {}
        })

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