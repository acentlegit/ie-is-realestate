/**
 * LiveKit Token Service
 * Generates tokens for video calls
 */

import "dotenv/config"; // Load .env file
import express from "express";
import { AccessToken } from "livekit-server-sdk";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Must match Vite proxy target: /api/video -> http://localhost:3001
const PORT = process.env.VIDEO_SERVICE_PORT || 3001;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "demo_key";
const LIVEKIT_SECRET = process.env.LIVEKIT_SECRET || "demo_secret";
const LIVEKIT_URL = process.env.LIVEKIT_URL || "wss://demo.livekit.cloud";

app.get("/token", (req, res) => {
  try {
    const { name, room, role } = req.query;
    
    if (!name || !room) {
      return res.status(400).json({ error: "Missing 'name' or 'room' parameter" });
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, { 
      identity: name 
    });
    
    at.addGrant({ 
      roomJoin: true, 
      room: room,
      canPublish: true,
      canSubscribe: true
    });

    const token = at.toJwt();
    
    console.log(`✅ Token generated for ${name} in room ${room}`);
    
    res.json({ 
      token, 
      url: LIVEKIT_URL 
    });
  } catch (error) {
    console.error("❌ Failed to generate token:", error);
    res.status(500).json({ 
      error: "Failed to generate token", 
      message: error.message 
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "video-service",
    livekit: LIVEKIT_API_KEY ? "configured" : "not configured"
  });
});

app.listen(PORT, () => {
  console.log(`📹 Video Service running on port ${PORT}`);
  console.log(`📹 LiveKit URL: ${LIVEKIT_URL}`);
});
