# EC2 Deployment – Common Errors and Fixes

This doc covers the errors you see when running the Intent Platform on EC2 (e.g. `http://44.199.236.31:3000`): **Intent 500**, **Email 405**, **Keycloak using mock auth**, and **RAG timeout**.

---

## 1. "Using mock authentication (Keycloak disabled)"

**What you see:** Console log: `Using mock authentication (Keycloak disabled)` and `Auth initialized, authenticated: true`.

**Why it happens:**
- The frontend is built with `VITE_USE_MOCK_AUTH=true`, **or**
- The app is loaded over **HTTP** (not HTTPS and not localhost). Browsers block the Web Crypto API on non-secure origins, so Keycloak’s JS adapter fails and the app falls back to mock auth (and may set `localStorage.useMockAuth = true`).

**What “works” in mock mode:** You are treated as logged in (e.g. user `dev`), so Intent, Compliance, Decisions, etc. still run. Only real Keycloak login/roles are disabled.

**If you still see "Using mock authentication" after setting VITE_USE_MOCK_AUTH=false:**
- The app also uses **localStorage**: if Keycloak failed once, it sets `useMockAuth=true`. **Clear it:** DevTools → Application → Local Storage → your app origin → delete key `useMockAuth` (or set to `false`), then refresh.
- Ensure the **deployed** frontend was **rebuilt** with the correct `.env` (VITE_USE_MOCK_AUTH=false, VITE_KEYCLOAK_URL=...) and the new image/container is running.

**To use real Keycloak on EC2:**
1. **Keycloak admin:** Open `http://44.199.236.31:8080` (or `https://44.199.236.31:8443` if you use HTTPS for Keycloak) → Realm **intent-platform** → Clients → **intent-frontend** → Settings:
   - **Valid redirect URIs:** `https://44.199.236.31/*`, `https://44.199.236.31:8443/*` (and `http://...` only if you still use HTTP for the app)
   - **Web origins:** `https://44.199.236.31`, `https://44.199.236.31:8443`
   - Save.
2. **Use HTTPS for the app and Keycloak** so the browser does not show "form not secure" and Web Crypto works. In the frontend **build** (`.env.production` before `npm run build` or Docker build), set:
   - `VITE_USE_MOCK_AUTH=false`
   - `VITE_KEYCLOAK_URL=https://44.199.236.31:8443` (use the **HTTPS** URL where Keycloak is reachable, e.g. nginx on 8443; do **not** use `http://` in production or you get "form not secure" and Web Crypto errors)
   - `VITE_KEYCLOAK_REALM=intent-platform`
   - `VITE_KEYCLOAK_CLIENT_ID=intent-frontend`
3. Open the **app** over **HTTPS** (e.g. `https://44.199.236.31` or `https://44.199.236.31:8443` if app and Keycloak share the same nginx). If the app is on the same origin as Keycloak, the code will default Keycloak URL to the current origin when on HTTPS.
4. **Production API URL:** Set `VITE_UNIFIED_ENGINE_URL=` (empty) so intent/compliance requests go to same origin (`/v1/*`) and Nginx proxies to the backend. Do **not** use `http://localhost:8000` in the production build.

See **KEYCLOAK_ROLES_SETUP.md** for realm roles and user setup.

---

## 2. POST /v1/intent/execute 500 (Internal Server Error)

**What you see:** `Intent analysis error: Intent analysis failed: Internal Server Error` and `POST http://44.199.236.31:3000/v1/intent/execute 500`.

**Why it happens:** The backend (Ollama) is failing: wrong/missing model, out-of-memory, or an uncaught exception in the intent engine.

**What to do on EC2:**
1. **Check backend logs:**
   ```bash
   docker compose logs backend --tail 100
   ```
   Look for Ollama errors (e.g. model not found, 500 from Ollama).

2. **Ensure Ollama has the correct model:**
   - Backend uses `OLLAMA_MODEL` from env (e.g. `llama3.2:1b`). Set it in `docker-compose.yml` and in `.env`:
     ```yaml
     environment:
       OLLAMA_MODEL: ${OLLAMA_MODEL:-llama3.2:1b}
     ```
   - On the server:
     ```bash
     docker exec intent-ollama ollama list
     docker exec intent-ollama ollama pull llama3.2:1b   # if missing
     ```
   - Restart backend so it picks up the model:
     ```bash
     docker compose up -d --force-recreate backend
     ```

3. **If the instance is small:** Use a small model (e.g. `llama3.2:1b`). Larger models (e.g. `llama3` 4.7GB) can OOM on t3.large.

---

## 3. POST /api/email/v1/send 405 or 404 (Method Not Allowed / Not Found)

**What you see:** `[Email Service] Failed to send INTENT_CREATED to 1 recipient(s)` and `POST http://44.199.236.31:3000/api/email/v1/send 405` or **404**.

**Why it happens:**
- **405:** Nginx is not proxying `/api/` to the backend; the request hits `location /` (static files), which returns 405 for POST.
- **404:** Nginx is proxying to the backend, but the backend doesn’t have the route (old backend image or app.py without the email stub).

**What to do:**
1. **Use the nginx config that proxies `/api/` to the backend.**  
   The repo’s `deploy/nginx-unified.conf` already has:
   ```nginx
   location /api/ {
       proxy_pass $backend_upstream$request_uri;
       ...
   }
   ```
2. **Rebuild the frontend image** so the container uses this config (the Dockerfile copies `nginx-unified.conf`).
3. **Redeploy the frontend:**
   ```bash
   docker compose build frontend --no-cache
   docker compose up -d --force-recreate frontend
   ```
4. Ensure the **backend** has the stub route `POST /api/email/v1/send`. Redeploy the backend with the latest `app.py` (email stub). **Verify on EC2:** get backend container IP/port (e.g. from `docker compose ps`), then from the server: `curl -s -o /dev/null -w "%{http_code}" -X POST http://<backend_ip>:8000/api/email/v1/send -H "Content-Type: application/json" -d '{}'` — should be **200**.

After this, `POST /api/email/v1/send` should return 200 (stub) and the console should stop showing 405/404.

---

## 4. RAG query failed: TimeoutError: signal timed out

**What you see:** `[RAG Integration] RAG query failed (non-blocking): TimeoutError: signal timed out`.

**Why it happens:** The frontend calls the backend RAG endpoint with a timeout (e.g. 60s or 120s). The backend (Ollama) is slow or not responding in time.

**What to do:**
1. **Rebuild the frontend** so it uses the increased RAG timeout (e.g. 120s in `src/api/intentApi.js`). If you’re still on an old build, the timeout may still be 60s.
2. **Check backend/Ollama:** Same as for Intent 500 – correct `OLLAMA_MODEL`, enough memory, and `docker compose logs backend` for RAG errors.
3. RAG is **non-blocking**: the rest of the app (Intent, Decisions, etc.) still works; only the RAG insight panel may be empty.

---

## 5. Intent / Compliance very slow (“takes so much time to understand the intent”)

**What you see:** Intent analysis or compliance takes a long time (30s–2+ minutes), or “compliance soon on” and long waits.

**Why it happens:** The backend uses **Ollama** (LLM) on the same EC2 instance. The first request after a restart loads the model into memory, so it’s slower; later requests are faster but still depend on model size and CPU/RAM.

**What to do:**
- Use a **small model** on EC2: `OLLAMA_MODEL=llama3.2:1b` (in `.env` and `docker-compose.yml`). Larger models (e.g. `llama3` 4.7GB) are slow or OOM on small instances.
- Ensure the model is **pulled** on the server: `docker exec <ollama_container> ollama pull llama3.2:1b`.
- **First request** after backend/container start will be slower (model load); subsequent intent/compliance calls should be quicker.
- If you need faster responses, use a larger instance or a dedicated LLM API.

---

## 6. Production .env for EC2 (frontend build)

Use these values when **building** the frontend for EC2 (so the bundle has the right URLs). In your **local** `.env` (or build args on EC2) before `npm run build` or Docker build:

```env
# Same-origin: intent/compliance go to /v1/* (nginx proxies to backend). Do NOT use localhost:8000 here.
VITE_USE_UNIFIED_ENGINE=true
VITE_UNIFIED_ENGINE_URL=

# Keycloak (EC2)
VITE_KEYCLOAK_URL=http://44.199.236.31:8080
VITE_KEYCLOAK_REALM=intent-platform
VITE_KEYCLOAK_CLIENT_ID=intent-frontend
VITE_USE_MOCK_AUTH=false

# Email (same-origin; nginx proxies /api/ to backend)
VITE_EMAIL_SERVICE_URL=/api/email
```

Then **rebuild** the frontend and redeploy the container so the running app uses these values.

---

## 7. Quick checklist after deploying to EC2

| Issue              | Action |
|--------------------|--------|
| Keycloak = mock    | Clear localStorage `useMockAuth`; set Keycloak redirect URIs in admin (`http://44.199.236.31:3000/*`); rebuild frontend with `VITE_USE_MOCK_AUTH=false`, `VITE_KEYCLOAK_URL=http://44.199.236.31:8080`. Over HTTP, Web Crypto may still block—HTTPS recommended for real login. |
| Intent 500         | Check `docker compose logs backend`, set `OLLAMA_MODEL`, pull model, recreate backend. |
| Email 405 / 404    | Nginx: `location /api/` to backend; backend: `POST /api/email/v1/send` stub; rebuild frontend and recreate both containers. |
| Intent/Compliance slow | Use `OLLAMA_MODEL=llama3.2:1b`; first request loads model; smaller instance = slower. |
| RAG timeout        | Rebuild frontend (longer timeout); ensure Ollama/backend are healthy. |

After fixing backend and frontend images and recreating containers, sync the latest code to EC2, rebuild, and run `docker compose up -d --force-recreate` for the services you changed.
