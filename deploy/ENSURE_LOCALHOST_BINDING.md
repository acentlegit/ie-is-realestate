# 🔒 Critical: Ensure Localhost Binding

**All engines and services MUST bind to `127.0.0.1` (localhost only) for security.**

---

## ✅ How to Verify

### Check Current Binding

```bash
# On EC2, after starting services
sudo netstat -tlnp | grep -E ':(7001|7002|7003|7004|7005|7006|7007|7008|3002)'
```

**Correct output (localhost only):**
```
tcp  0  0  127.0.0.1:7001  *:*  LISTEN  12345/node
tcp  0  0  127.0.0.1:7002  *:*  LISTEN  12346/node
```

**❌ Wrong output (publicly accessible):**
```
tcp  0  0  0.0.0.0:7001  *:*  LISTEN  12345/node
```

---

## 🔧 How to Fix Engine Binding

### Option 1: Update Engine Code (Recommended)

**In each engine's `src/index.ts` or `dist/index.js`:**

```typescript
// BEFORE (insecure)
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// AFTER (secure)
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
```

### Option 2: Use PM2 Environment Variable

**PM2 ecosystem.config.js already sets `HOST: '127.0.0.1'`**

Make sure your engine code reads it:

```typescript
const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 7001;
app.listen(PORT, HOST);
```

---

## 📝 Services to Update

### Email Service

**`email-service/server.js`:**

```javascript
const PORT = process.env.PORT || 7008;
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`Email service running on http://${HOST}:${PORT}`);
});
```

### Video Service

**`video-service/server.js`:**

```javascript
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`Video service running on http://${HOST}:${PORT}`);
});
```

### Speech Service (Python)

**`speech-service/main.py`:**

```python
import uvicorn

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host=host, port=port)
```

---

## ✅ Verification Checklist

- [ ] All engines bind to `127.0.0.1` only
- [ ] `netstat` shows `127.0.0.1:PORT` not `0.0.0.0:PORT`
- [ ] Security group does NOT expose ports 7001-7008, 3002
- [ ] Nginx proxies requests to `127.0.0.1:PORT`
- [ ] External access works via Nginx only
- [ ] Direct access to engine ports fails from outside

---

## 🚨 Security Impact

**If engines bind to `0.0.0.0`:**
- ❌ Engines are publicly accessible
- ❌ Bypass Nginx security
- ❌ No rate limiting
- ❌ Direct API access

**If engines bind to `127.0.0.1`:**
- ✅ Only accessible via Nginx
- ✅ Centralized security
- ✅ Rate limiting possible
- ✅ Proper authentication flow

---

**This is CRITICAL for production security! 🔒**
