# Sir’s WhatsApp integration (intent-ai-llama, intent-ai-nextjs-v2, intent-ai-preview)

This doc summarizes what was integrated from Sir’s three codebases so the RealEstate Intent AI Platform matches his instructions and UI reference.

---

## 1. intent-ai-llama

- **“Use this code as basis to integrate with your code”**
- **Integrated:**
  - **LLaMA intent parsing:** `src/services/llamaIntentService.js` – optional path when `VITE_USE_LLAMA=true`, calls Groq/OpenAI-compatible endpoint and returns structured intent JSON.
  - **Env:** `env.example` documents `VITE_LLAMA_*` for LLaMA.

---

## 2. intent-ai-nextjs-v2 (feature list)

- **Integrated:**
  - **Real LLaMA (OpenAI-compatible):** `llamaIntentService.js` (see above).
  - **Buyer vs Investor routing:** `src/services/routeModelService.js` – `routeModel(text, intent)` returns `"buyer"` or `"investor"` from text/intent.
  - **Session-ready architecture:** Existing Workspace/Sessions (Buyer, Agent, Property) kept and aligned with Sir’s layout.
  - **Confidence calibration + fallback:** `src/services/confidenceService.js` – `calibrateConfidence(intent)` 0–100; refinement when low.
  - **Intent refinement prompts:** `src/services/refinementService.js` – `getRefinementPrompt(intent)` for missing budget/location/preferences.
  - **Compliance checks (RERA / EC / Title):** Existing Compliance Engine; “Relevant Legal Checks” in UI and Trust Receipt checks (RERA, EC/Title).
  - **Bank & loan matching:** `src/services/loanService.js` – `matchBanks(intent)` returns SBI/HDFC/ICICI and loan terms from intent budget.
  - **Investor ROI engine:** `src/services/roiService.js` – `calculateROI(intent)` for investor route (gross yield, appreciation, exit horizon).
  - **Board-room-ready Trust Receipt UI:** Right-panel Trust Receipt uses `trustReceiptService.js` and Sir’s dark card (#0b1220), checks (Intent, RERA, EC/Title, Loan, ROI), generated-at and intent/location/budget.
  - **Postgres-ready DB schema:** Backend/Action Engine already use Postgres; no frontend schema change.
  - **Env config example:** `env.example` (see above).

---

## 3. intent-ai-preview (UI)

- **“UI code” – layout and copy aligned with Sir’s screenshot**
- **Integrated:**
  - **“What are you trying to do today?”** – Header above three buttons:
    - **Buy a Home** (primary when BUY_PROPERTY)
    - **Invest in Property** (highlight when investor route)
    - **Verify Property / Documents**
  - **AI Insights (70% Confidence):** Purple card with:
    - Title “AI Insights (X% Confidence)” – X from confidence prop or RAG, default 70.
    - Bullets from RAG summary or defaults: “Prices vary by locality & property type”, “Prioritize metro, schools & commercial access”, “Verify title deed, registration & encumbrance”, “Check RERA for new projects”, “Compare bank & NBFC loan options”.
    - **“Apply to my search”** and **“Ask follow-up >”** buttons.
  - **Relevant Legal Checks:** Section under AI Insights; shows legal refs + timestamps (from explainability or placeholder).
  - **Intent input placeholder:** “I want to buy a 2BHK in Vizag under 50L near metro”.
  - **Try:** “Try: Investment property with rental yield”, “Try: Verify legal status of a flat” (click to fill input).
  - **Your Buying Journey:** Right panel – Intent Identified (Ready), Compliance Check (Pass/Pending), AI Recommendation (Ready/Pending), Final Decision (Locked).
  - **Start Video Call:** Existing green “Start Video Call” in the middle panel.

---

## 4. Flow (Sir’s instructions)

- Intent → **Confidence** → if &lt; 70% show **refinement prompt**.
- **Route:** buyer vs investor from text/intent.
- **Compliance** (RERA / EC / Title) via existing engine and “Relevant Legal Checks” + Trust Receipt checks.
- **Loan match** from intent budget; **ROI** when route is investor.
- **Trust Receipt** built from intent + compliance + loans + ROI and shown in board-room style.
- **AI Insights** always visible in buyer session, with Apply and Ask follow-up.

---

## 5. Files added/updated

| Item | Location |
|------|----------|
| LLaMA intent service | `src/services/llamaIntentService.js` |
| Refinement prompts | `src/services/refinementService.js` |
| Bank/loan matching | `src/services/loanService.js` |
| Investor ROI | `src/services/roiService.js` |
| Buyer vs Investor | `src/services/routeModelService.js` |
| Confidence | `src/services/confidenceService.js` |
| Trust Receipt | `src/services/trustReceiptService.js` |
| Sir UI (What/Insights/Legal/Try/Journey/Trust) | `src/components/LivingSpaceLayout.jsx` |
| Sir data (refinement, loans, ROI, route, trust, confidence) | `src/screens/Intent.jsx` |
| Env example | `env.example` |

---

## 6. How to test

1. **Buy a Home:** Choose “Buy a Home”, enter e.g. “I want to buy a 2BHK in Vizag under 50L near metro”, Analyze.  
   Expect: AI Insights (confidence), Relevant Legal Checks, Your Buying Journey, Bank & Loan (if budget), Trust Receipt.
2. **Invest:** “Invest in property with rental yield” (or use Try), Analyze.  
   Expect: Investor route, ROI card, same journey and Trust Receipt.
3. **Verify:** “Verify Property / Documents” (or use Try), Analyze.  
   Expect: Compliance/legal flow and Trust Receipt.

All of the above is wired to match Sir’s WhatsApp description and UI reference.
