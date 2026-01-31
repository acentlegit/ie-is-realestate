# 🎯 Multi-Intent Feature

## Overview

The platform now supports processing **multiple intents in a single input**. Each intent gets its own decisions and actions based on:
- **Intent Type** (BUY_PROPERTY, SELL_PROPERTY, RENT_PROPERTY)
- **Location** (Mumbai, Delhi, Bangalore, etc.)
- **Budget** (if specified)

---

## ✅ How It Works

### Input Format

You can input multiple intents in several ways:

**1. Newline-separated:**
```
Buy a home in Mumbai for 2 crores
Purchase property in Bangalore under 1 crore
I want a house in Delhi for 80 lakhs
```

**2. Semicolon-separated:**
```
Buy a home in Mumbai for 2 crores; Purchase property in Bangalore under 1 crore; I want a house in Delhi for 80 lakhs
```

**3. Numbered list:**
```
1. Buy a home in Mumbai for 2 crores
2. Purchase property in Bangalore under 1 crore
3. I want a house in Delhi for 80 lakhs
```

---

## 🔍 Intent Type Detection

The system automatically detects intent type from keywords:

| Intent Type | Keywords |
|------------|----------|
| **BUY_PROPERTY** | buy, buying, purchase, purchasing, acquire, find, want, looking for, need |
| **SELL_PROPERTY** | sell, selling, sale, list, listing, put on market |
| **RENT_PROPERTY** | rent, renting, lease, leasing, rental |

**Default:** If no keywords match, defaults to `BUY_PROPERTY`

---

## 📍 Location Extraction

Locations are extracted from:
- Direct city name matching (Mumbai, Delhi, Bangalore, etc.)
- Pattern matching ("in Mumbai", "at Delhi", "for Mumbai")
- Intent Engine extracted location

**Supported Cities:**
- Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Pune, Kolkata, Ahmedabad, Surat, Jaipur, Lucknow, Kanpur, Nagpur, Indore, Thane, Bhopal, Visakhapatnam, Patna, Vadodara, Ghaziabad, Ludhiana, Agra, Nashik

---

## 💰 Budget Extraction

Budget is extracted from:
- "2 crores" → ₹2Cr (20,000,000)
- "1.5 crore" → ₹1.5Cr (15,000,000)
- "80 lakhs" → ₹80L (8,000,000)
- "60 lakh" → ₹60L (6,000,000)
- "₹2L" → ₹2L (200,000)
- "₹1.5Cr" → ₹1.5Cr (15,000,000)

---

## 🎯 Processing Flow

For each intent:

1. **Parse Intent** - Extract type, location, budget
2. **Analyze Intent** - Send to Intent Engine
3. **Check Compliance** - Run compliance check (BUY/SELL/RENT)
4. **Get Decisions** - Generate decisions based on intent type and location
5. **Evaluate Risk** - Risk assessment (BUY only)
6. **Get Actions** - Generate actions when decisions are made
7. **RAG Insights** - Knowledge-based insights for location

---

## 🖥️ UI Features

### Tab Switcher

When multiple intents are detected:
- **Tab bar appears** at the top showing all intents
- Each tab shows: `Intent Number. Type Location (Budget)`
- Example: `1. Buy Mumbai (₹2L)`, `2. Sell Pune`, `3. Rent Kolkata`

### Switching Intents

- Click any tab to switch to that intent
- Each intent has its own:
  - Decisions
  - Actions
  - Compliance status
  - Risk assessment
  - Knowledge insights

---

## 📋 Example Input

```
Buy a home in Mumbai for 2 crores
Purchase property in Bangalore under 1 crore
I want a house in Delhi for 80 lakhs
Find me a home in Chennai for 60 lakhs
Buy apartment in Hyderabad for 1.5 crores
Sell my property in Pune
Rent a house in Kolkata
```

**Result:**
- 7 separate intents processed
- Each with its own decisions and actions
- Switch between them using tabs

---

## 🔧 Technical Details

### Files Modified

1. **`src/utils/multiIntentParser.js`** (NEW)
   - `parseMultipleIntents()` - Parses input into multiple intents
   - `detectIntentType()` - Detects BUY/SELL/RENT
   - `extractLocation()` - Extracts location from text
   - `extractBudget()` - Extracts budget from text

2. **`src/screens/Intent.jsx`**
   - Added `multipleIntents` state
   - Added `activeIntentIndex` state
   - Modified `handleAnalyze()` to detect and process multiple intents
   - Added `handleSwitchIntent()` to switch between intents
   - Added tab switcher UI

### State Management

Each intent stores:
- `intent` - Intent object from Intent Engine
- `compliance` - Compliance result
- `decisions` - Array of decisions
- `actions` - Array of actions
- `lifecycleState` - Current lifecycle state
- `riskResult` - Risk assessment
- `ragResponse` - RAG insights
- `parsedInfo` - Original parsed data (type, location, budget)

---

## 🚀 Usage

1. **Enter multiple intents** in the input field (newline or semicolon separated)
2. **Click "Analyze"** or press Enter
3. **System processes all intents** automatically
4. **Switch between intents** using the tabs at the top
5. **Make decisions and complete actions** for each intent independently

---

## ✅ Benefits

- **Batch Processing** - Process multiple property searches at once
- **Independent Workflows** - Each intent has its own decisions and actions
- **Location-Specific** - Decisions and actions tailored to each location
- **Type-Specific** - Different workflows for BUY, SELL, and RENT
- **Easy Navigation** - Tab switcher for quick access to any intent

---

## 🧪 Testing

**Test Input:**
```
Buy a home in Mumbai for 2 crores
Sell my property in Pune
Rent a house in Kolkata
```

**Expected:**
- 3 tabs appear at the top
- Each intent processed separately
- Each has its own decisions and actions
- Can switch between them seamlessly
