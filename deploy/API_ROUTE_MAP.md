# 🗺️ API Route Map - Frontend to Backend

**Complete mapping of frontend API calls to backend engines**

---

## 📋 Route Mapping

| Frontend Call | Nginx Route | Backend Engine | Port | Status |
|---------------|------------|----------------|------|--------|
| `/api/intent/v1/execute` | `/api/intent` | Intent Engine | 7001 | ✅ |
| `/api/intent/v1/health` | `/api/intent` | Intent Engine | 7001 | ✅ |
| `/api/compliance/v1/execute` | `/api/compliance` | Compliance Engine | 7002 | ✅ |
| `/api/decision/v1/intent/resume` | `/api/decision` | Decision Engine | 7003 | ⚠️ 404 |
| `/api/decision/v1/execute` | `/api/decision` | Decision Engine | 7003 | ✅ |
| `/api/decision/v1/decision/{id}/select` | `/api/decision` | Decision Engine | 7003 | ✅ |
| `/api/action/v1/execute` | `/api/action` | Action Engine | 7004 | ✅ |
| `/api/risk/v1/execute` | `/api/risk` | Risk Engine | 7005 | ✅ |
| `/api/explainability/v1/execute` | `/api/explainability` | Explainability Engine | 7006 | ⚠️ 405 |
| `/api/evidence/v1/execute` | `/api/evidence` | Evidence Engine | 7007 | ✅ |
| `/api/email/*` | `/api/email` | Email Service | 7008 | ✅ |
| `/api/video/token` | `/api/video` | Video Service | 3002 | ✅ |
| `/ws/transcribe` | `/ws/` | Speech Service | 8000 | ✅ |

---

## 🔍 Current Issues

### 1. Decision Engine - Resume Route (404)

**Frontend Call:**
```
GET /api/decision/v1/intent/resume?userId=...&tenantId=...
```

**Expected:** 200 OK with resume data

**Actual:** 404 Not Found

**Fix:** Verify route exists in Decision Engine OpenAPI spec

### 2. Explainability Engine - Execute Route (405)

**Frontend Call:**
```
POST /api/explainability/v1/execute
```

**Expected:** 200 OK

**Actual:** 405 Not Allowed

**Fix:** Check if route accepts POST method

### 3. Intent Engine - Execute Route (500)

**Frontend Call:**
```
POST /api/intent/v1/execute
```

**Expected:** 200 OK

**Actual:** 500 Internal Server Error

**Error:** `"Cannot read properties of undefined (reading 'complianceStatus')"`

**Fix:** Check backend code - missing compliance data

---

## ✅ Verified Working Routes

- ✅ `/api/intent/v1/health`
- ✅ `/api/compliance/v1/health`
- ✅ `/api/decision/v1/health`
- ✅ Frontend using correct URLs (`/api/...`)

---

## 🧪 Test All Routes

**On EC2, run:**

```bash
# Health checks
curl http://localhost/api/intent/v1/health
curl http://localhost/api/compliance/v1/health
curl http://localhost/api/decision/v1/health
curl http://localhost/api/action/v1/health
curl http://localhost/api/risk/v1/health
curl http://localhost/api/explainability/v1/health
curl http://localhost/api/evidence/v1/health

# Test resume route
curl "http://localhost/api/decision/v1/intent/resume?userId=test&tenantId=intent-platform"
```

---

**This map helps identify which routes need fixing! 🗺️**
