"""
Speech-to-Text Service - Whisper Backend
WebSocket service for real-time speech transcription
"""

import whisper
import numpy as np
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import ssl
import certifi
import os
import io
import tempfile

# Fix SSL certificate verification for macOS
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_headers=["*"],
    allow_methods=["*"],
)

# Load Whisper model (base model for faster processing)
model = whisper.load_model("base")

@app.websocket("/ws/transcribe")
async def transcribe(ws: WebSocket):
    await ws.accept()
    audio_buffer = []

    try:
        while True:
            data = await ws.receive_bytes()
            
            # Store the encoded audio chunks
            audio_buffer.append(data)
            
            # Process when we have enough data (approximately 3 seconds)
            total_size = sum(len(chunk) for chunk in audio_buffer)
            
            if total_size > 50000:  # Threshold for ~3 seconds
                try:
                    # Combine all audio chunks
                    combined_audio = b''.join(audio_buffer)
                    
                    # Create a temporary file to store the WebM audio
                    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tmp_file:
                        tmp_file.write(combined_audio)
                        tmp_file_path = tmp_file.name
                    
                    try:
                        # Load and transcribe using Whisper (it handles audio file formats)
                        # Whisper uses ffmpeg internally to decode WebM
                        result = model.transcribe(tmp_file_path, fp16=False)
                        
                        # Send the transcription result
                        transcript_text = result.get("text", "").strip()
                        if transcript_text:
                            await ws.send_text(transcript_text)
                    
                    except Exception as transcribe_error:
                        print(f"Transcription error: {transcribe_error}")
                        # If file-based transcription fails, try alternative approach
                        try:
                            import soundfile as sf
                            audio_data, sample_rate = sf.read(tmp_file_path, dtype='float32')
                            result = model.transcribe(audio_data, fp16=False)
                            transcript_text = result.get("text", "").strip()
                            if transcript_text:
                                await ws.send_text(transcript_text)
                        except Exception as alt_error:
                            print(f"Alternative transcription error: {alt_error}")
                    
                    finally:
                        # Clean up temporary file
                        try:
                            os.unlink(tmp_file_path)
                        except:
                            pass
                    
                    # Clear the buffer
                    audio_buffer.clear()
                    
                except Exception as e:
                    print(f"Error processing audio: {e}")
                    audio_buffer.clear()
                    
    except Exception as e:
        print(f"WebSocket error: {e}")
        # Handle disconnections gracefully
        try:
            if ws.client_state.name == "CONNECTED":
                await ws.close()
        except:
            pass

# Health check
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "speech-to-text",
        "model": "whisper-base"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
