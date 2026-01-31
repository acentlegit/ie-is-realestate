# Step 2: How to Test Login → Dashboard → Intent Flow

## Quick test (frontend only, mock auth)

1. **Enable mock auth** (no Keycloak needed):
   - In browser DevTools → Application → Local Storage, set:
     - `useMockAuth` = `true`
   - Or create a `.env` in the frontend root with: `VITE_USE_MOCK_AUTH=true`
   - Then restart the dev server.

2. **Start the frontend** (from `intent-frontend-full-working`):
   ```bash
   npm install   # if not done
   npm run dev   # or: npm start
   ```
   Open the URL shown (e.g. http://localhost:5173).

3. **Verify Step 2 behaviour**:
   - You should land on **Dashboard** (role-based: Buyer by default).
   - **Sidebar** (left) shows:
     - **Dashboard** (first item) → stays on dashboard.
     - **Intent** (second item) → goes to intent flow.
   - Click **Intent** → same layout (sidebar + topbar), intent flow in main area.
   - Click **Dashboard** → back to role dashboard.
   - No double sidebars; one layout everywhere.

4. **Try different roles** (mock only):
   - In Local Storage set `mockRole` to: `buyer` | `seller` | `agent` | `admin`
   - Refresh the page. Dashboard and sidebar should reflect that role.

## Full stack test (with backend + optional Keycloak)

- Start the **unified backend** (if you use it) so `/v1/health` and intent APIs work.
- If using **Keycloak**: do not set `useMockAuth`; ensure Keycloak is running and users have the right realm roles (`buyer`, `seller`, `agent`, `admin`). After login you should be redirected to `/dashboard` and see the same sidebar (Dashboard, then Intent).

## Checklist

- [ ] After “login”, first page is **Dashboard** (not Intent).
- [ ] Sidebar shows **Dashboard** first, **Intent** second on every authenticated page.
- [ ] **Intent** and **Living Space** pages keep the same sidebar/topbar (no double layout).
- [ ] Agent/Admin dashboards render correctly without a second sidebar.
