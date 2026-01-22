/**
 * Speech-to-Text Component
 * Converts speech to text and sends to chat
 * Supports both Browser Speech Recognition API and Whisper backend
 */

import { useState, useEffect, useRef } from "react";

const SPEECH_SERVICE_URL = import.meta.env.VITE_SPEECH_SERVICE_URL || "ws://localhost:8000/ws/transcribe";
// Default to browser API (works immediately, no setup needed)
// Set VITE_USE_WHISPER_BACKEND=true in .env to use Whisper backend
const USE_WHISPER_BACKEND = import.meta.env.VITE_USE_WHISPER_BACKEND === "true";

export default function SpeechToText({ onTranscript, disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const wsRef = useRef(null);
  const recorderRef = useRef(null);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("[Speech-to-Text] Browser does not support Speech Recognition API");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript.trim());
        if (onTranscript) {
          onTranscript(finalTranscript.trim());
        }
      } else {
        setTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("[Speech-to-Text] Error:", event.error);
      
      // Handle different error types
      switch (event.error) {
        case "no-speech":
          // Auto-restart if no speech detected (user might be quiet)
          if (isListening) {
            recognition.stop();
            setTimeout(() => {
              if (isListening && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.warn("[Speech-to-Text] Failed to restart after no-speech:", e);
                }
              }
            }, 1000);
          }
          break;
          
        case "aborted":
          // Aborted is usually intentional (user stopped or browser stopped it)
          // Don't show error, just stop listening gracefully
          console.log("[Speech-to-Text] Recognition aborted (this is normal when stopping)");
          setIsListening(false);
          break;
          
        case "not-allowed":
          alert("Microphone permission denied. Please enable microphone access in your browser settings.");
          setIsListening(false);
          break;
          
        case "network":
          console.warn("[Speech-to-Text] Network error - speech recognition may be unavailable");
          setIsListening(false);
          break;
          
        case "audio-capture":
          alert("No microphone found. Please connect a microphone and try again.");
          setIsListening(false);
          break;
          
        case "service-not-allowed":
          alert("Speech recognition service is not available. Please try again later.");
          setIsListening(false);
          break;
          
        default:
          // For other errors, log but don't auto-restart
          console.warn("[Speech-to-Text] Unhandled error:", event.error);
          setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still listening (but not if it was aborted)
      // The "aborted" error will set isListening to false, so this won't restart
      if (isListening && recognitionRef.current) {
        setTimeout(() => {
          if (isListening && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              // If start fails, it might be because recognition was aborted
              // This is normal, just stop listening
              if (error.name !== "InvalidStateError") {
                console.warn("[Speech-to-Text] Failed to restart:", error);
              }
              setIsListening(false);
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [onTranscript, isListening]);

  const startListening = async () => {
    if (isListening) return;

    if (USE_WHISPER_BACKEND) {
      // Use Whisper backend via WebSocket
      try {
        wsRef.current = new WebSocket(SPEECH_SERVICE_URL);
        
        wsRef.current.onopen = async () => {
          console.log("[Speech-to-Text] Whisper backend connected");
          
          // Get microphone stream
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          recorderRef.current = new MediaRecorder(stream);
          
          recorderRef.current.ondataavailable = async (e) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              const buf = await e.data.arrayBuffer();
              wsRef.current.send(buf);
            }
          };
          
          wsRef.current.onmessage = (e) => {
            const text = e.data;
            if (text && text.trim()) {
              setTranscript(text);
              if (onTranscript) {
                onTranscript(text);
              }
            }
          };
          
          wsRef.current.onerror = (error) => {
            console.error("[Speech-to-Text] WebSocket error:", error);
            alert("Speech service connection failed. Falling back to browser API.");
            setIsListening(false);
          };
          
          recorderRef.current.start(1000); // Send chunks every 1 second
          setIsListening(true);
          setTranscript("");
        };
        
        wsRef.current.onerror = (error) => {
          console.error("[Speech-to-Text] Failed to connect to Whisper backend:", error);
          alert("Speech service not available. Please start the speech service or use browser API.");
          setIsListening(false);
        };
      } catch (error) {
        console.error("[Speech-to-Text] Failed to start Whisper backend:", error);
        alert("Failed to start speech recognition. Please check microphone permissions.");
        setIsListening(false);
      }
    } else {
      // Use Browser Speech Recognition API
      if (recognitionRef.current && !isListening) {
        try {
          // Check if recognition is already running
          if (recognitionRef.current.state === "running") {
            console.log("[Speech-to-Text] Recognition already running");
            return;
          }
          
          recognitionRef.current.start();
          setIsListening(true);
          setTranscript("");
          console.log("[Speech-to-Text] Started listening");
        } catch (error) {
          console.error("[Speech-to-Text] Failed to start:", error);
          
          // Handle specific errors
          if (error.name === "InvalidStateError") {
            // Recognition is already running or in an invalid state
            console.log("[Speech-to-Text] Recognition in invalid state, resetting...");
            setIsListening(false);
            // Try again after a short delay
            setTimeout(() => {
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                  setIsListening(true);
                } catch (e) {
                  console.error("[Speech-to-Text] Retry failed:", e);
                }
              }
            }, 500);
          } else {
            alert("Failed to start speech recognition. Please check microphone permissions.");
            setIsListening(false);
          }
        }
      }
    }
  };

  const stopListening = () => {
    if (USE_WHISPER_BACKEND) {
      // Stop Whisper backend
      if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      setIsListening(false);
    } else {
      // Stop Browser API - set isListening first to prevent auto-restart
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Recognition might already be stopped, which is fine
          console.log("[Speech-to-Text] Recognition already stopped");
        }
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        className="btn"
        onClick={toggleListening}
        disabled={disabled}
        style={{
          padding: "12px 16px",
          borderRadius: 12,
          minWidth: 50,
          background: isListening ? "rgba(239,68,68,0.2)" : "rgba(0,0,0,0.2)",
          border: isListening ? "1px solid var(--bad)" : "1px solid var(--stroke)",
          animation: isListening ? "pulse 1.5s infinite" : "none"
        }}
        title={isListening ? "Stop listening" : "Start voice input"}
      >
        {isListening ? "🔴" : "🎤"}
      </button>
      {isListening && (
        <div className="small" style={{ color: "var(--bad)", fontSize: 11 }}>
          Listening...
        </div>
      )}
      {transcript && !isListening && (
        <div className="small" style={{ fontSize: 11, opacity: 0.7 }}>
          "{transcript}"
        </div>
      )}
    </div>
  );
}
