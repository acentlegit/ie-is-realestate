# APIs for India & USA Entire Real Estate

Where to get **API access** for India-wide and USA-wide real estate data.

---

## India – Where to Get the API

### 1. Commercial (nationwide property / transaction data)

| Provider | Coverage | API / How to get it |
|--------|----------|----------------------|
| **Propstack** | 1M+ residential sale/rent/loan transactions; office, warehousing, developer loans across India | **API:** [loans.propstack.com](https://loans.propstack.com) – developer portal & docs. Contact via [propstack.com](https://www.propstack.com/) for API access and pricing. |
| **PropEquity** | 160K+ projects, 59K+ developers, 44+ cities; RERA status, pricing, construction stage | **API:** Subscription-based; B2B / enterprise. Contact [propequity.in](https://www.propequity.in/about-company) for API or data feeds. |
| **99acres / MagicBricks / Housing** | Listings, property-level data | **API:** Usually via B2B or data partners (e.g. Actowiz, other extraction vendors). No public self-serve API; contact sales. |

### 2. Government / regulatory (RERA, state-wise)

| Source | Coverage | API / How to get it |
|--------|----------|----------------------|
| **API Setu (India govt)** | Gov APIs including Housing & Shelter | **API:** [apisetu.gov.in](https://apisetu.gov.in/) → [directory.apisetu.gov.in](https://directory.apisetu.gov.in/) to browse; [console.apisetu.gov.in](https://console.apisetu.gov.in/) to use. Free; sign up / DigiLocker. Check “Housing & Shelter” for real estate–related APIs. |
| **Open Government Data (OGD) India** | State-wise RERA implementation datasets | **API:** [data.gov.in/apis](https://www.data.gov.in/apis/) – request API access for specific datasets. RERA progress dataset: [data.gov.in resource](https://www.data.gov.in/resource/stateuts-wise-real-estate-regulation-development-act-2016-rera-implementation-progress) (CSV/JSON/XLS download; API on request). |
| **Unified RERA Portal** | All-India project/agent/complaint data (integrates state RERAs) | **Portal:** [rera.mohua.gov.in](https://rera.mohua.gov.in) – no public API documented yet; check MoHUA/API Setu for future APIs. |
| **State RERA portals** (e.g. Maharashtra) | Per-state projects, agents, complaints | **API:** None standard; [maharera.maharashtra.gov.in](https://maharera.maharashtra.gov.in) etc. are web-only unless a state exposes an API. |

**Summary – India “entire real estate” API:**  
- **Best single place to ask for an API:** **Propstack** ([propstack.com](https://www.propstack.com/), API docs at [loans.propstack.com](https://loans.propstack.com)) for nationwide transactions and analytics.  
- **Government/regulatory:** **API Setu** ([apisetu.gov.in](https://apisetu.gov.in/)) for any housing-related govt APIs; **data.gov.in** for RERA datasets (request API access).

---

## USA – Where to Get the API

### 1. Government (nationwide housing statistics – free)

| Provider | Coverage | API / How to get it |
|--------|----------|----------------------|
| **US Census Bureau** | Housing units, new construction, ACS housing (tenure, values, rents) – nation, state, county, metro | **API:** [census.gov/data/api.html](https://www.census.gov/data/api.html). **Key:** [census.gov/data/developers/api-key.html](https://www.census.gov/data/developers/api-key.html). Free. |
| **Census Housing Estimates** | Annual housing unit estimates | Endpoint e.g. `api.census.gov/data/2019/pep/housing` – use with Census API key. |
| **American Community Survey (ACS)** | Detailed housing by geography | Census Data API, ACS tables – same key as above. |

### 2. Commercial (property-level, nationwide)

| Provider | Coverage | API / How to get it |
|--------|----------|----------------------|
| **Zillow Group** | ~100M properties; Zestimate, public records, research datasets | **API:** [zillowgroup.com/developers](https://www.zillowgroup.com/developers/). [Public/Research data](https://www.zillowgroup.com/developers/public-data/) – some free downloads at [zillow.com/research/data](https://www.zillow.com/research/data/). Commercial APIs often invite-only; apply via developer site. |
| **ATTOM** | 158M+ US properties, 99% population; parcel, ownership, sales, valuations, schools, etc. | **API:** [api.developer.attomdata.com](https://api.developer.attomdata.com/). REST, JSON/XML. [attomdata.com/solutions/property-data-api](https://www.attomdata.com/solutions/property-data-api/). Free 30-day trial; then contact for pricing. |
| **CoreLogic** | 5.5B+ property records, ~99.9% US market | **API:** [corelogic.com](https://www.corelogic.com/360-property-data/api-data/) – Trestle/WebAPI. Enterprise; contact for access. |
| **ListHub (Realtor.com)** | MLS-accurate listings, 60K+ brokers, 50 states | **API:** [listhub.com/api-documentation](https://www.listhub.com/api-documentation/) – Syndication API (RESO). Apply/implement via ListHub. |
| **RentCast / HouseCanary / Regrid / DataTree** | Rent, AVMs, parcels, county records | Each has its own developer/API site; typically sign up or contact for API access. |

**Summary – USA “entire real estate” API:**  
- **Free, nationwide stats:** **Census Bureau** – [census.gov/data/api.html](https://www.census.gov/data/api.html), get key at [census.gov/data/developers/api-key.html](https://www.census.gov/data/developers/api-key.html).  
- **Property-level, nationwide:** **ATTOM** ([api.developer.attomdata.com](https://api.developer.attomdata.com/)) – trial then paid; **Zillow** ([zillowgroup.com/developers](https://www.zillowgroup.com/developers/)) – apply for commercial API; **CoreLogic** – enterprise.  
- **Listings (MLS):** **ListHub** ([listhub.com/api-documentation](https://www.listhub.com/api-documentation/)).

---

## Quick links

| Region | Use case | Where to get the API |
|--------|----------|----------------------|
| **India** | Nationwide transactions, analytics | [Propstack](https://www.propstack.com/) / [loans.propstack.com](https://loans.propstack.com) |
| **India** | Government / RERA | [API Setu](https://apisetu.gov.in/), [data.gov.in](https://www.data.gov.in/apis/) |
| **USA** | Nationwide housing stats (free) | [Census API](https://www.census.gov/data/api.html) + [API key](https://www.census.gov/data/developers/api-key.html) |
| **USA** | Property-level, full USA | [ATTOM](https://api.developer.attomdata.com/), [Zillow Developers](https://www.zillowgroup.com/developers/) |
| **USA** | MLS listings | [ListHub API](https://www.listhub.com/api-documentation/) |

If you tell us your priority (India vs USA, stats vs property-level vs listings), we can align the Intent AI platform’s OpenAPI adapters to these endpoints.

---

## data.gov.in RERA APIs – What to do (step-by-step)

You’re on **APIs → Filter "RERA"** and see **2 APIs**:
1. **State/UTs-wise RERA Implementation Progress Report (19-03-2022)** – Rajya Sabha  
2. **State/UT-wise Complaints Disposed under RERA (30 June 2019)** – Ministry of Housing & Urban Affairs  

Do this:

### 1. Get an API key

- **Log in** at [data.gov.in](https://www.data.gov.in/).
- Go to **My Account** (often via your profile/username).
- Find **“Generate API Key”** or **“API Key”** and create/copy your key.  
  (If you don’t see it, check **Help** → [data.gov.in/help](https://www.data.gov.in/help) or **“How to use Datasets/APIs”**.)

### 2. Get the exact API URL for each RERA API

- From the **APIs** list, **click the title** of each of the 2 RERA APIs.
- On the **API detail page** you’ll see:
  - **API Endpoint** or **Resource URL** – this is the base URL to call.
  - **Parameters** – usually `api-key` (or similar) and optionally `format`, `offset`, `limit`, etc.
- Copy the **endpoint URL** and note the **parameter names** for both APIs.

### 3. Call the API with your key

- Append or send your key as instructed (often as a query parameter, e.g. `?api-key=YOUR_KEY`).
- Example pattern (exact names depend on the detail page):
  - `https://api.data.gov.in/.../...?api-key=YOUR_KEY&format=json`
- Use the **same key** for both RERA APIs.

### 4. If the API detail page shows “Request API” or “No API”

- Some resources are **dataset-only** (CSV/JSON/XLS download, no live API).
- If you see **“Request API”**, use that to ask NIC/data.gov.in to enable an API for that resource.
- For the **2 you already see under “APIs”**, they should have a callable endpoint; use step 2 to get the exact URL from each one’s detail page.

### 5. Quick reference

- **APIs listing:** [data.gov.in/apis](https://www.data.gov.in/apis/) → search/filter **RERA**.
- **API key:** My Account on data.gov.in → Generate / copy API Key.
- **Help:** [data.gov.in/help](https://www.data.gov.in/help) → “How to use Datasets/APIs” (or equivalent) for official steps and param names.

Once you have the **two endpoint URLs** and the **api-key** parameter name from the detail pages, you can plug them into your app or our platform adapters.

---

## You’re on the API tab: GET /resource/81242853-a9f9-44f4-a100-ea817d9c9ebe – what to do now

You see **OAS 2.0**, **GET**, **/resource/81242853-a9f9-44f4-a100-ea817d9c9ebe**. Do this:

### Step 1 – Get your API key

- Top-right → your name (**saibhanu_785...**) → **My Account** (or **Dashboard** → My Account).
- Find **“API Key”** or **“Generate API Key”**.
- Copy the key (often 32-character hex). Keep it secret.

### Step 2 – Find the base URL on this same API tab

On the **same API tab** where you see `GET /resource/81242853-a9f9-44f4-a100-ea817d9c9ebe`:

- Look for **“Server”**, **“Base URL”**, **“Host”**, or an **“Try it” / “Execute”** button.
- If there’s a **“Try it”** or **“Execute”**: click it. The box usually shows the **full request URL** (base + path). Copy that base part (e.g. `https://…………/`).
- If you see **Parameters** or **Query**, check how **api-key** is passed (e.g. `api-key`, `apikey`).

Common patterns (only try if you can’t see a base URL on the page):

- `https://api.data.gov.in/resource/81242853-a9f9-44f4-a100-ea817d9c9ebe?api-key=YOUR_KEY&format=json`
- `https://data.gov.in/api/1/rest/datastore/81242853-a9f9-44f4-a100-ea817d9c9ebe?api-key=YOUR_KEY&format=json`

Replace `YOUR_KEY` with the key from Step 1.

### Step 3 – Call the API

**Browser or curl:**

```text
# Replace YOUR_KEY and BASE_URL if needed
curl "https://api.data.gov.in/resource/81242853-a9f9-44f4-a100-ea817d9c9ebe?api-key=YOUR_KEY&format=json"
```

**JavaScript (fetch):**

```javascript
const apiKey = 'YOUR_KEY'; // from My Account
const resourceId = '81242853-a9f9-44f4-a100-ea817d9c9ebe';
const url = `https://api.data.gov.in/resource/${resourceId}?api-key=${apiKey}&format=json`;

fetch(url)
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

If you get **404** or **403**, the base URL or param name is different – use the **exact** base URL and param names from the API tab (or “Try it” / “Execute”).

### Step 4 – Use the same flow for the second RERA API

- Go back to **APIs** → filter **RERA**.
- Open **“State/UT-wise Complaints Disposed off… as on 30 June, 2019”**.
- On its **API** tab, note its **path** (e.g. `/resource/<another-uuid>`) and **base URL**.
- Call it the same way with the **same API key**.

**Summary:** Get API key from **My Account** → on the API tab find **base URL** (or use “Try it”) → call `BASE_URL/resource/81242853-a9f9-44f4-a100-ea817d9c9ebe?api-key=YOUR_KEY&format=json`.

---

## Your two RERA API keys – what to do in this project

You have:

- **First key** → State/UTs-wise RERA Implementation Progress Report (resource `81242853-a9f9-44f4-a100-ea817d9c9ebe`)
- **Second key** → State/UT-wise Complaints Disposed under RERA (resource ID from that API's detail page)

### 1. Put keys in `.env` (never commit `.env`)

In the project root, create or edit `.env` and add:

```bash
VITE_DATA_GOV_IN_RERA1_KEY=<paste your first key here>
VITE_DATA_GOV_IN_RERA2_KEY=<paste your second key here>
```

Copy from `env.example` if needed: `VITE_DATA_GOV_IN_RERA1_KEY=` and `VITE_DATA_GOV_IN_RERA2_KEY=` are already listed there.

### 2. Call the first RERA API (Implementation Progress)

**curl (replace `YOUR_FIRST_KEY` with your actual first key):**

```bash
curl "https://api.data.gov.in/resource/81242853-a9f9-44f4-a100-ea817d9c9ebe?api-key=YOUR_FIRST_KEY&format=json"
```

**In the app:** use the helper that reads from env:

```javascript
import { fetchReraProgress } from './api/dataGovInReraApi';

const data = await fetchReraProgress();
// data is JSON or { error: "…" }
```

### 3. Call the second RERA API (Complaints Disposed)

- On data.gov.in, open the **second** RERA API ("State/UT-wise Complaints Disposed off… as on 30 June, 2019") → **API** tab.
- Copy its **path** (e.g. `/resource/<uuid>`). That `<uuid>` is the second resource ID.
- In `src/api/dataGovInReraApi.js`, set `RERA_COMPLAINTS_RESOURCE_ID` to that UUID (it's currently `REPLACE_WITH_SECOND_RESOURCE_ID`).
- Use your **second key** in `.env` as `VITE_DATA_GOV_IN_RERA2_KEY`.

**curl (replace `YOUR_SECOND_KEY` and `SECOND_RESOURCE_UUID`):**

```bash
curl "https://api.data.gov.in/resource/SECOND_RESOURCE_UUID?api-key=YOUR_SECOND_KEY&format=json"
```

**In the app:**

```javascript
import { fetchReraComplaints } from './api/dataGovInReraApi';

const data = await fetchReraComplaints();
```

### 4. Files added/updated

- **`env.example`** – `VITE_DATA_GOV_IN_RERA1_KEY=` and `VITE_DATA_GOV_IN_RERA2_KEY=` (add your keys in `.env`).
- **`src/api/dataGovInReraApi.js`** – `fetchReraProgress()`, `fetchReraComplaints()`; they use the env keys and `https://api.data.gov.in/resource/…`. Update `RERA_COMPLAINTS_RESOURCE_ID` with the second API's resource UUID from data.gov.in.

### 5. RERA Progress API response shape (first API)

The first RERA API returns:

- **`status`**: `"ok"`
- **`total`**: 37 (all states/UTs)
- **`count`**, **`limit`**, **`offset`**: pagination
- **`records`**: array of objects, one per state/UT. Fields:
  - `state_ut` – e.g. "Andhra Pradesh", "Gujarat"
  - `general_rules` – "Notified"
  - `establishment_of_regulatory_authority` – "Permanent" / "Interim"
  - `establishment_of_appellate_tribunal` – "Permanent" / "Not Established"
  - `web_portal` – "Setup" / "Not Setup"
  - `adjudicating_officer` – "Appointed" / "Not Appointed"
  - `registrations___projects` – project count or "NA"
  - `registrations___agents` – agent count or "NA"
  - `total_no__of_cases_disposed_by_authority_` – cases disposed or "NA"

Use **`fetchReraProgress({ offset, limit })`** for one page, or **`fetchReraProgressAll()`** to get all 37 records.
