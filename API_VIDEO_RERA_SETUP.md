# Video & RERA API Setup

Use this when the **video** or **RERA** APIs are not working in the app.

---

## 1. Video (LiveKit token)

**Symptom:** Video call fails with “token service not reachable” or similar.

**Fix:**

1. Start the token server on port **3001** (Vite proxies `/api/video` → `http://localhost:3001`):

   ```bash
   cd video-service
   npm install   # if needed
   npm start
   ```

   Or use `./video-service/start.sh` and ensure `VIDEO_SERVICE_PORT=3001` in `video-service/.env`.

2. In **video-service**, set LiveKit credentials in `video-service/.env`:

   - `LIVEKIT_API_KEY`
   - `LIVEKIT_SECRET`
   - `LIVEKIT_URL` (e.g. `wss://your-project.livekit.cloud`)

   Get keys from [LiveKit Cloud](https://cloud.livekit.io/).

3. **(Optional)** In the **frontend** `.env`, you can override the token URL:

   - `VITE_LIVEKIT_TOKEN_URL` – full URL to your token endpoint (e.g. `https://yourserver.com/token`)
   - `VITE_LIVEKIT_URL` – WebSocket URL for LiveKit

   If unset, in dev the app uses `/api/video/token`, which is proxied to `http://localhost:3001/token`.

---

## 2. RERA (data.gov.in)

**Symptom:** Compliance → “India RERA” shows “VITE_DATA_GOV_IN_RERA1_KEY not set” or RERA never loads.

**Fix:**

1. Get an API key from [data.gov.in](https://data.gov.in):
   - Log in → **My Account** → create or copy your **API key**.

2. In the **frontend** `.env` (project root, next to `vite.config.js`), add:

   ```env
   VITE_DATA_GOV_IN_RERA1_KEY=your_api_key_here
   ```

   Use the key that has access to the “RERA Implementation Progress” resource.

3. Restart the dev server (`npm run dev`) so Vite picks up the new env.

4. Open **Compliance** in the app; the “India RERA” section will call the API via `/api/rera` (proxied to `https://api.data.gov.in` in dev).

**Second RERA API (Complaints):** To use the “Complaints Disposed” API, set `VITE_DATA_GOV_IN_RERA2_KEY` and set `RERA_COMPLAINTS_RESOURCE_ID` in `src/api/dataGovInReraApi.js` to the resource UUID from that API’s page on data.gov.in.

---

## Summary

| API      | What to run/set                                                                 | Port / URL in dev      |
|----------|----------------------------------------------------------------------------------|------------------------|
| Video    | `cd video-service && npm start`, set `LIVEKIT_*` in `video-service/.env`         | 3001 (proxy `/api/video`) |
| RERA     | `VITE_DATA_GOV_IN_RERA1_KEY=...` in frontend `.env`, restart dev server           | `/api/rera` → api.data.gov.in |
