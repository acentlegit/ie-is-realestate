#!/bin/bash

# Email Service Startup Script

echo "📧 Starting Email Service..."

# Check if .env exists
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Creating from .env.example..."
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "✅ Created .env file. Please configure it with your SendGrid credentials."
    echo "   Required: SENDGRID_API_KEY and FROM_EMAIL"
    exit 1
  else
    echo "❌ .env.example not found. Please create .env manually."
    exit 1
  fi
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Start the service
echo "🚀 Starting email service on port 7008..."
node server.js
