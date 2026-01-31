# 🎯 Location-Specific Decisions

## Overview

The platform now generates **location-specific and budget-specific decisions** based on the actual intent details. For example, if someone enters "buy a home in Vijayawada under 1 crore", the decisions will be tailored to:
- **Location**: Vijayawada-specific property options
- **Budget**: Properties within 1 crore (85L-95L range)
- **Property Type**: Based on location and budget (e.g., 4BHK, 3BHK)
- **Area/Colony**: Location-specific areas and colonies

---

## ✅ How It Works

### 1. Location Extraction

The system extracts location from:
- **Direct city matching**: Vijayawada, Mumbai, Delhi, etc.
- **Pattern matching**: "in Vijayawada", "at Mumbai", "for Delhi"
- **Intent Engine extraction**: Fallback to engine's extraction

**Supported Cities (Expanded List):**
- Major cities: Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Pune, Kolkata
- Tier-2 cities: Vijayawada, Guntur, Warangal, Coimbatore, Kochi, Mysore, etc.
- Tier-3 cities: And many more...

### 2. Budget Extraction

Budget is extracted and normalized:
- "1 crore" → ₹1Cr (10,000,000)
- "85 lakhs" → ₹85L (8,500,000)
- "under 1 crore" → Budget range: ₹85L - ₹95L

### 3. Decision Generation

The Decision Engine receives:
```json
{
  "intent": {
    "id": "...",
    "type": "BUY_PROPERTY",
    "payload": {
      "location": "Vijayawada",
      "budget": 10000000,
      "area": null
    },
    "extractedInfo": {
      "location": "Vijayawada",
      "city": "Vijayawada",
      "budget": 10000000
    },
    "text": "buy a home in vijayawada under 1 crore"
  }
}
```

### 4. Location-Specific Decisions

Based on location and budget, the Decision Engine generates:

**Example for "Vijayawada under 1 crore":**

1. **Property Type Decision**
   - Options: 4BHK, 3BHK, 2BHK
   - Recommended: 4BHK (based on budget and location)

2. **Budget Decision**
   - Options: ₹85L, ₹90L, ₹95L
   - Recommended: ₹85L (within 1 crore limit)

3. **Location/Area Decision**
   - Options: Specific colonies/areas in Vijayawada
   - Examples: Benz Circle, MG Road, Governorpet, etc.

4. **Property Features Decision**
   - Options: Based on location standards
   - Examples: Gated community, Parking, Lift, etc.

---

## 🔧 Technical Implementation

### Frontend Changes

1. **`src/api/intentApi.js`**
   - Updated `getDecisions()` to pass:
     - `payload.location` and `payload.budget`
     - `extractedInfo` (location, city, budget)
     - `text` (original input for context)

2. **`src/utils/multiIntentParser.js`**
   - Enhanced location extraction with expanded city list
   - Improved pattern matching for cities like Vijayawada
   - Better budget extraction and normalization

3. **`src/screens/Intent.jsx`**
   - Preserves parsed location/budget in intent object
   - Ensures Decision Engine receives complete information
   - Works for both single and multi-intent scenarios

### Backend Requirements

The Decision Engine should:
- Use `intent.payload.location` for location-specific decisions
- Use `intent.payload.budget` for budget-specific options
- Use `intent.extractedInfo` for additional context
- Generate decisions tailored to the location (e.g., Vijayawada-specific areas)

---

## 📋 Example Scenarios

### Scenario 1: Vijayawada

**Input:** "buy a home in vijayawada under 1 crore"

**Decisions Generated:**
- Property Type: 4BHK (recommended for budget)
- Budget: ₹85L - ₹95L range
- Location: Benz Circle, MG Road, Governorpet (Vijayawada-specific)
- Features: Gated community, Parking (location standards)

### Scenario 2: Mumbai

**Input:** "buy a home in mumbai for 2 crores"

**Decisions Generated:**
- Property Type: 2BHK/3BHK (Mumbai pricing)
- Budget: ₹1.8Cr - ₹2Cr range
- Location: Andheri, Bandra, Powai (Mumbai-specific)
- Features: High-rise, Lift, Security (Mumbai standards)

### Scenario 3: Multiple Locations

**Input:**
```
Buy a home in Vijayawada under 1 crore
Purchase property in Mumbai for 2 crores
```

**Result:**
- Each intent gets location-specific decisions
- Vijayawada: 4BHK, ₹85L, Benz Circle
- Mumbai: 2BHK, ₹1.8Cr, Andheri

---

## ✅ Benefits

1. **Accurate Decisions** - Based on actual location and budget
2. **Location-Specific** - Decisions tailored to city/area
3. **Budget-Appropriate** - Options within specified budget
4. **Realistic Options** - Property types and areas that make sense for the location
5. **Better User Experience** - Relevant decisions, not generic ones

---

## 🧪 Testing

**Test Input:**
```
buy a home in vijayawada under 1 crore
```

**Expected Decisions:**
- Property Type: 4BHK (Vijayawada-specific)
- Budget: ₹85L - ₹95L (within 1 crore)
- Location: Vijayawada-specific areas/colonies
- Features: Based on Vijayawada market standards

**Verify:**
- Decisions mention "Vijayawada" or specific areas
- Budget options are within 1 crore
- Property types are appropriate for the location

---

## 🔄 Next Steps

1. **Backend Decision Engine** should use location/budget to generate:
   - Location-specific property types
   - Budget-appropriate price ranges
   - Area/colony options for the location
   - Location-specific features

2. **RAG Integration** can provide:
   - Location-specific market data
   - Average property prices in the area
   - Popular colonies/areas in the location
   - Location-specific regulations

3. **Action Generation** should be:
   - Location-specific (e.g., "Visit property in Benz Circle, Vijayawada")
   - Budget-appropriate (e.g., "Verify budget of ₹85L")
   - Context-aware (e.g., "Check RERA registration for Vijayawada property")
