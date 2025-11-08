module.exports = {
  apps: [
    {
      name: 'traffic-control-prod',
      script: 'npm',
      args: 'start',
      cwd: '/home/root/Trafic-manager-uretim-dosyasi',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      max_memory_restart: '1G',
      autorestart: true,
      min_uptime: '10s',
      max_restarts: 5,
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', '.next'],
    },
  ],
};