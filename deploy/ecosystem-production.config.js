module.exports = {
  apps: [
    // Backend Engines - Bind to localhost only (127.0.0.1)
    {
      name: 'intent-engine',
      script: 'engines/intent-engine/dist/index.js',
      env: { PORT: 7001, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'compliance-engine',
      script: 'engines/compliance-engine/dist/index.js',
      env: { PORT: 7002, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'decision-engine',
      script: 'engines/decision-engine/dist/index.js',
      env: { PORT: 7003, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'action-engine',
      script: 'engines/action-engine/dist/index.js',
      env: { PORT: 7004, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'risk-engine',
      script: 'engines/risk-engine/dist/index.js',
      env: { PORT: 7005, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'explainability-engine',
      script: 'engines/explainability-engine/dist/index.js',
      env: { PORT: 7006, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'evidence-engine',
      script: 'engines/evidence-engine/dist/index.js',
      env: { PORT: 7007, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    },
    // Services
    {
      name: 'email-service',
      script: 'email-service/server.js',
      env: { PORT: 7008, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M'
    },
    {
      name: 'video-service',
      script: 'video-service/server.js',
      env: { PORT: 3002, HOST: '127.0.0.1', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M'
    }
  ]
};
