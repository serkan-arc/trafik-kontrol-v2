module.exports = {
  apps: [
    {
      name: 'hurriyet-saglik',
      script: 'server.cjs',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}