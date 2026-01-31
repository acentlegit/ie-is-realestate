# Keycloak Role-Based Login Setup

The app uses **Keycloak** for authentication and **realm roles** for role-based dashboards. Every role (buyer, seller, agent, property owner, admin) is driven by Keycloak realm roles.

---

## Keycloak over HTTP (e.g. EC2 at http://IP:3000)

When the app is loaded over **HTTP** (not HTTPS and not localhost), the browser restricts the **Web Crypto API**. Keycloak’s JS adapter needs Web Crypto, so you may see:

- **"Web Crypto API is not available"** / **"Keycloak initialization error"**
- The app then falls back to **mock auth** (no real Keycloak login).

To use **real Keycloak** on EC2 or any non-localhost URL you have two options:

1. **Serve the app over HTTPS** (e.g. put Nginx behind a TLS terminator, or use ALB + ACM certificate). Then Keycloak will initialize and login will work.
2. **Accept mock auth over HTTP** for testing: the app still works; users are treated as logged in with a default role for development.

For **localhost** (e.g. `http://localhost:3000`), browsers allow Web Crypto, so Keycloak works over HTTP there.

---

## Step-by-step (from Client details – intent-frontend)

You don’t need **client roles** for this app. The app uses **realm roles**. Follow these steps in order.

### Step 1 – Check client Settings (you’re on intent-frontend)

1. Click the **Settings** tab (under the client name).
2. Check:
   - **Client authentication:** OFF (public client).
   - **Valid redirect URIs:** add:
     - For local dev: `http://localhost:3000/*`, `http://localhost:5173/*`
     - For EC2 (your app URL): `http://44.199.236.31:3000/*`
   - **Web origins:** add:
     - For local dev: `http://localhost:3000`, `http://localhost:5173` (or `+` for dev)
     - For EC2: `http://44.199.236.31:3000`
3. Click **Save** if you changed anything.

**Keycloak admin URL (EC2):** `http://44.199.236.31:8080` — open this in the browser to manage the realm and the `intent-frontend` client.

### Step 2 – Create realm roles (not client roles)

1. In the **left menu**, click **Realm roles** (under “Configure” or at the same level as “Clients”).
2. Click **Create role**.
3. Create **6 roles**, one by one. For each:
   - **Role name:** type exactly: `buyer` → **Save**. Then repeat for: `seller`, `agent`, `property_owner`, `admin`, `superuser`.

(Leave “Composite” OFF and “Description” empty if you want.)

### Step 3 – Create a user

1. In the **left menu**, click **Users**.
2. Click **Add user**.
3. **Username:** e.g. `buyer1` (required).
4. **Email:** e.g. `buyer1@test.com` (optional).
5. **First name / Last name:** optional.
6. Click **Create**.

### Step 4 – Set password for the user

1. Open the user you just created (click the username).
2. Go to the **Credentials** tab.
3. Click **Set password**.
4. **Password:** e.g. `test123` (or your choice).
5. **Temporary:** OFF (so they don’t have to change it on first login).
6. Click **Save**.

### Step 5 – Assign a realm role to the user

1. Stay on that user’s page.
2. Click the **Role mapping** tab.
3. Click **Assign role**.
4. Choose **Filter by realm roles** (or leave filter as is).
5. Select one role, e.g. **buyer**.
6. Click **Assign**.

Repeat Step 3–5 for more users (e.g. `seller1` with role `seller`, `agent1` with role `agent`, `admin1` with role `admin`).

### Step 6 – Use the app

1. Make sure the app is **not** using mock auth (no `VITE_USE_MOCK_AUTH=true` in `.env`, and remove `useMockAuth` from browser Local Storage if set).
2. Open the app (e.g. `http://localhost:3000` or `http://localhost:5173`).
3. You should be redirected to Keycloak login. Log in with e.g. `buyer1` / `test123`.
4. After login you should land on the **Dashboard** with the **buyer** experience.

**Important:** The realm dropdown (top left) must be **intent-platform**. If you’re in **master**, create realm `intent-platform`, switch to it, create client `intent-frontend` there, then do Steps 1–5 in that realm.

## Troubleshooting: "Invalid username or password"

The app always logs in against realm **intent-platform**. If you see "Invalid username or password", do this:

### 1. Check which realm you created the user in

- In Keycloak Admin, click the **realm dropdown** (top left). If it says **master**, the user you created is in **master**, but the app uses **intent-platform** — so that user does not exist for the app.
- **Fix:** Switch to realm **intent-platform** (or create it). Then in **intent-platform** create the user again (Users → Add user), set password, and assign a realm role (e.g. `buyer`). Log in again.

### 2. Confirm the login URL

- When the app redirects to Keycloak, look at the browser URL. It should contain `realm=intent-platform`. If it says `realm=master`, the app config might be wrong (check `src/auth/keycloakAuth.js` — realm must be `intent-platform`).

### 3. Reset the password

- In Keycloak Admin, realm **intent-platform** → **Users** → open the user → **Credentials** tab → **Set password**. Enter a new password, turn **Temporary** OFF, Save. Try logging in again with that password.

### 4. Check the user is enabled

- Open the user → **Details** (or first tab). Ensure **Enabled** is **ON**. If it is OFF, turn it ON and Save.

### 5. Username exactly as created

- Use the **Username** you set in Keycloak (case-sensitive). Email is not used for login unless you changed realm settings.

---

## Roles Used by the App

| Realm role       | Dashboard / experience |
|------------------|------------------------|
| `buyer`          | Buyer dashboard (intent, decisions, actions) |
| `seller`         | Seller dashboard (properties, buyer activity, actions) |
| `agent`          | Agent dashboard (assigned intents, accept/reject/close requests) |
| `property_owner` | Same as seller (properties, evidence, history) |
| `admin`          | Admin dashboard (system health, policies, risk, evidence) |
| `superuser`      | Same as admin |

**Resolution order:** If a user has multiple roles, the app uses: **admin/superuser** > **agent** > **seller** > **property_owner** > **buyer**.

---

## 1. Run Keycloak

```bash
./RECREATE_KEYCLOAK.sh
```

Or with Docker:

```bash
docker run -d --name keycloak -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```

Open **http://localhost:8080** → Administration Console → login **admin** / **admin**.

---

## If you see the Clients list (e.g. account, intent-platform-realm, master-realm)

You are likely in the **master** realm. The app does **not** use master; it uses:

- **Realm:** `intent-platform` (a separate realm)
- **Client:** `intent-frontend` (a client inside that realm)

So you need to **create the realm first**, then the client:

1. **Switch realm / Create realm:** Click the **realm** dropdown (top left, e.g. "master") → **Create realm**.
2. **Realm name:** `intent-platform` → Create.
3. You are now in realm **intent-platform**. Go to **Clients** → **Create client**.
4. **Client ID:** `intent-frontend` → Next → turn **Client authentication** OFF (public client) → Next.
5. **Valid redirect URIs:** `http://localhost:3000/*` (or your app URL, e.g. `http://localhost:5173/*`).
6. **Web origins:** `http://localhost:3000` or `http://localhost:5173` (or `+` for dev).
7. Save.

Then continue with **Realm roles** and **Users** below (all inside realm **intent-platform**).

---

## 2. Create Realm and Client

1. **Create realm:** Keycloak Admin → Create realm → Name: `intent-platform` → Create.
2. **Create client:** Clients → Create client:
   - Client ID: `intent-frontend`
   - Client authentication: **OFF** (public client)
   - Valid redirect URIs: `http://localhost:3000/*` (or your frontend origin)
   - Web origins: `http://localhost:3000` (or `+` to allow all)
   - Save.

---

## 3. Create Realm Roles

**If you see roles like `admin`, `create-realm`, `default-roles-master`:** you are in the **master** realm. The app uses realm **intent-platform**. Click the **realm dropdown** (top left) → select **intent-platform**. If it’s not there, create it first (see “Create Realm and Client” above).

Then in realm **intent-platform** → **Realm roles** → **Create role**. Create these **exact** role names (one at a time):

- `buyer`
- `seller`
- `agent`
- `property_owner`
- `admin`
- `superuser`

(You can add more later; the app only uses these.)

---

## 4. Create Users and Assign Roles

1. **Users** → **Add user**:
   - Username, Email, First/Last name as needed.
   - Credentials → Set password (turn off “Temporary” if you want).
2. **Role mapping** (for that user):
   - Click **Role mapping** → **Assign role**.
   - Filter by realm roles and assign one (or more) of: `buyer`, `seller`, `agent`, `property_owner`, `admin`, `superuser`.

Examples:

- **Buyer:** assign only `buyer`.
- **Seller:** assign only `seller`.
- **Agent:** assign only `agent`.
- **Property owner:** assign only `property_owner`.
- **Admin:** assign `admin` (or `superuser`).

If a user has multiple roles, the app picks the first in resolution order (admin/superuser > agent > seller > property_owner > buyer).

---

## 5. Use Keycloak in the App (No Mock Auth)

- **Development:** Do **not** set `VITE_USE_MOCK_AUTH=true` in `.env`. Remove `useMockAuth` from localStorage if it was set.
- **Production:** Do not enable mock auth; the app will use Keycloak for every role-based login.

Then:

1. Open the app (e.g. http://localhost:3000).
2. You are redirected to Keycloak login.
3. Log in with a user that has one of the realm roles above.
4. After login you land on **Dashboard**; the sidebar and content match the user’s role (buyer, seller, agent, property owner, admin).

---

## 6. Frontend Keycloak Config

Keycloak is configured in `src/auth/keycloakAuth.js`:

- **URL:** `http://localhost:8080` (override with env if needed).
- **Realm:** `intent-platform`.
- **Client:** `intent-frontend`.

Roles are read from **realm roles** in the token: `keycloak.tokenParsed.realm_access.roles`. No client roles are required for the app’s role logic.

---

## Summary

- **Yes:** Keycloak is used for every role-based login when mock auth is off.
- **Roles:** buyer, seller, agent, property owner (realm role `property_owner`), admin, superuser.
- **Setup:** Create realm `intent-platform`, client `intent-frontend`, realm roles above, then assign roles to users and log in via Keycloak.
