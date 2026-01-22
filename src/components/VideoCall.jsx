/**
 * Video Call Component - LiveKit Integration
 * For Agent/Buyer communication
 */

import { useState, useEffect, useRef } from "react";
import { Room, createLocalTracks } from "livekit-client";

const LIVEKIT_TOKEN_URL = import.meta.env.VITE_LIVEKIT_TOKEN_URL || "http://localhost:3001/token";
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || "wss://qhire-ai-interivew-xygij6p0.livekit.cloud";

export default function VideoCall({ userName, roomName = "intent-platform", onTranscript }) {
  const [room, setRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const joinRoom = async () => {
    try {
      // Get token from backend
      const response = await fetch(`${LIVEKIT_TOKEN_URL}?name=${userName}&room=${roomName}`);
      
      if (!response.ok) {
        throw new Error(`Token service returned ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Token service returned non-JSON response. Is the video service running? Response: ${text.substring(0, 100)}`);
      }
      
      const { token, url } = await response.json();
      
      if (!token) {
        throw new Error("No token received from video service");
      }
      
      // Create Room instance (new API in v2.17.0)
      const lkRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      
      // Connect to room
      await lkRoom.connect(url || LIVEKIT_URL, token);
      setRoom(lkRoom);
      setIsConnected(true);

      // Create local tracks (video + audio)
      const tracks = await createLocalTracks({ audio: true, video: true });
      
      // Publish tracks
      tracks.forEach(track => {
        lkRoom.localParticipant.publishTrack(track);
        
        // Attach video to local element
        if (track.kind === "video" && localVideoRef.current) {
          const element = track.attach();
          localVideoRef.current.appendChild(element);
        }
      });

      // Handle remote tracks
      lkRoom.on("trackSubscribed", (track, publication, participant) => {
        if (track.kind === "video" && remoteVideoRef.current) {
          const element = track.attach();
          remoteVideoRef.current.appendChild(element);
        }
        
        // Update participants list
        setParticipants(Array.from(lkRoom.remoteParticipants.values()));
      });

      lkRoom.on("participantConnected", () => {
        setParticipants(Array.from(lkRoom.remoteParticipants.values()));
      });

      lkRoom.on("participantDisconnected", () => {
        setParticipants(Array.from(lkRoom.remoteParticipants.values()));
      });

    } catch (error) {
      console.error("[Video Call] Failed to join room:", error);
      alert("Failed to start video call. Please check your connection.");
    }
  };

  const leaveRoom = async () => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
      setParticipants([]);
      
      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.innerHTML = "";
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.innerHTML = "";
      }
    }
  };

  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!isConnected ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📹</div>
          <div className="small" style={{ marginBottom: 16 }}>
            Start a video call with {roomName === "agent" ? "Agent" : "Buyer"}
          </div>
          <button className="btn primary" onClick={joinRoom}>
            Start Video Call
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="small">
              <b>Connected:</b> {participants.length + 1} participant{participants.length !== 0 ? "s" : ""}
            </div>
            <button className="btn" onClick={leaveRoom} style={{ background: "rgba(239,68,68,0.2)", color: "var(--bad)" }}>
              End Call
            </button>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: participants.length > 0 ? "1fr 1fr" : "1fr", gap: 12 }}>
            {/* Local Video */}
            <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "rgba(0,0,0,0.3)", minHeight: 200 }}>
              <div ref={localVideoRef} style={{ width: "100%", height: "100%" }} />
              <div style={{ position: "absolute", bottom: 8, left: 8, padding: "4px 8px", background: "rgba(0,0,0,0.6)", borderRadius: 4, fontSize: 11 }}>
                You ({userName})
              </div>
            </div>
            
            {/* Remote Video */}
            {participants.length > 0 && (
              <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "rgba(0,0,0,0.3)", minHeight: 200 }}>
                <div ref={remoteVideoRef} style={{ width: "100%", height: "100%" }} />
                <div style={{ position: "absolute", bottom: 8, left: 8, padding: "4px 8px", background: "rgba(0,0,0,0.6)", borderRadius: 4, fontSize: 11 }}>
                  {participants[0]?.identity || "Participant"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
