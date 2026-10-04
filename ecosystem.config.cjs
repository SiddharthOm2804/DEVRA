module.exports = {
  apps: [
    {
      name: "devpilot-api",
      script: "src/server.js",
      cwd: "./server",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
