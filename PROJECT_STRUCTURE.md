# 📁 Project Structure

## ✅ Architecture Overview

Your project is split into **two separate repositories**:

### 🎨 Frontend
**Location:** `/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working`

**Contains:**
- ✅ React/Vite frontend application
- ✅ `src/` - React components, screens, services
- ✅ `email-service/` - Email service (Node.js/Express)
- ✅ `video-service/` - LiveKit token service (Node.js/Express)
- ✅ `speech-service/` - Whisper speech-to-text (Python/FastAPI)
- ✅ `dist/` - Frontend build output
- ✅ `package.json` - Frontend dependencies

**Connects to backend engines on:**
- Port 7001: Intent Engine
- Port 7002: Compliance Engine
- Port 7003: Decision Engine
- Port 7004: Action Engine
- Port 7005: Risk Engine
- Port 7006: Explainability Engine
- Port 7007: Evidence Engine
- Port 7008: Email Service (local)

---

### ⚙️ Backend
**Location:** `/Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main`

**Contains:**
- ✅ `services/` - All backend engines (intent-engine, compliance-engine, etc.)
- ✅ `packages/` - Shared packages (@uip/core, @uip/db, etc.)
- ✅ `scripts/` - Build and start scripts
- ✅ `db/` - Database migrations
- ✅ `openapi/` - API specifications
- ✅ `rules/` - Business rules (real-estate.json, etc.)

**Engines run on:**
- Port 7001: Intent Engine
- Port 7002: Compliance Engine
- Port 7003: Decision Engine
- Port 7004: Action Engine
- Port 7005: Risk Engine
- Port 7006: Explainability Engine
- Port 7007: Evidence Engine

---

## 🚀 How to Start Everything

### 1. Start Backend Engines

```bash
cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main

# Install dependencies
npm install

# Build shared packages
npm run build --workspace=@uip/core

# Build all engines
npm run build --workspaces --if-present

# Start all engines
bash scripts/uip-engines-dev.sh
```

**OR** start engines individually:

```bash
PORT=7001 node services/intent-engine/dist/index.js &
PORT=7002 node services/compliance-engine/dist/index.js &
PORT=7003 node services/decision-engine/dist/index.js &
PORT=7004 node services/action-engine/dist/index.js &
PORT=7005 node services/risk-engine/dist/index.js &
PORT=7006 node services/explainability-engine/dist/index.js &
PORT=7007 node services/evidence-engine/dist/index.js &
```

### 2. Start Frontend Services

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

# Start email service
cd email-service
npm install
npm start
# Runs on port 7008

# Start video service (in another terminal)
cd video-service
npm install
npm start
# Runs on port 3002

# Start speech service (in another terminal)
cd speech-service
pip install -r requirements.txt
python main.py
# Runs on port 8000 (or configured port)
```

### 3. Start Frontend

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

npm install
npm run dev
# Runs on port 3000 (Vite default)
```

---

## 🔗 Connection Flow

```
Frontend (Port 3000)
  ↓
  ├─→ Intent Engine (7001) ← Backend
  ├─→ Compliance Engine (7002) ← Backend
  ├─→ Decision Engine (7003) ← Backend
  ├─→ Action Engine (7004) ← Backend
  ├─→ Risk Engine (7005) ← Backend
  ├─→ Explainability Engine (7006) ← Backend
  ├─→ Evidence Engine (7007) ← Backend
  ├─→ Email Service (7008) ← Frontend folder
  ├─→ Video Service (3002) ← Frontend folder
  └─→ Speech Service (8000) ← Frontend folder
```

---

## ✅ Summary

- **Frontend** = React app + email/video/speech services
- **Backend** = All engine services (intent, compliance, decision, etc.)
- **No copying needed** - Frontend connects to backend via HTTP on ports 7001-7007
- **Separate repositories** - Keep them separate, don't copy engines into frontend

---

**All UIP files have been removed from frontend. Project is clean! ✅**
