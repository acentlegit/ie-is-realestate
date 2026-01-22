#!/bin/bash

# Speech-to-Text Service Startup Script

echo "🎤 Starting Speech-to-Text Service (Whisper Backend)..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  Warning: ffmpeg is not installed. Whisper requires ffmpeg."
    echo "   Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)"
fi

# Start the service
echo "🚀 Starting service on port 8000..."
python3 main.py
