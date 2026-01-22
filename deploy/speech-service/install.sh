#!/bin/bash

# Speech-to-Text Service Installation Script
# Fixes SSL issues and installs dependencies

echo "🎤 Installing Speech-to-Text Service (Whisper Backend)..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip with SSL fix
echo "📦 Upgrading pip..."
pip install --upgrade pip --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org

# Install dependencies with SSL fix
echo "📦 Installing dependencies (this may take a few minutes)..."
pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -r requirements.txt

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  Warning: ffmpeg is not installed. Whisper requires ffmpeg."
    echo "   Install with: brew install ffmpeg (macOS)"
    echo "   The service will still start but may not work properly."
fi

echo "✅ Installation complete!"
echo ""
echo "To start the service:"
echo "  source venv/bin/activate"
echo "  python3 main.py"
echo ""
echo "Or use: ./start.sh"
