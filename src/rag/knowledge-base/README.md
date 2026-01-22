# Knowledge Base Directory

## 📁 Purpose

This directory contains the extracted knowledge base content from:
- `India_Real_Estate_RAG_and_Valuation.docx`
- `US_Real_Estate_RAG_and_Valuation.docx`

---

## 📋 Structure

```
knowledge-base/
├── india/
│   ├── market_data.txt
│   ├── regulatory_info.txt
│   ├── apis_and_sources.txt
│   ├── valuation_methods.txt
│   └── risk_factors.txt
├── us/
│   ├── market_data.txt
│   ├── regulatory_info.txt
│   ├── apis_and_sources.txt
│   ├── valuation_methods.txt
│   └── risk_factors.txt
└── README.md
```

---

## 🔄 How to Add Content

### Step 1: Extract from Documents

1. Open `India_Real_Estate_RAG_and_Valuation.docx`
2. Copy relevant sections
3. Paste into appropriate `.txt` files

### Step 2: Organize by Section

- **Market Data:** Price trends, market conditions, comparable properties
- **Regulatory Info:** RERA, state laws, compliance requirements
- **APIs & Sources:** API endpoints, database connections, external sources
- **Valuation Methods:** Formulas, methodologies, examples
- **Risk Factors:** Market risks, regulatory risks, location risks

### Step 3: Load into Vector Store

Run the loader script (to be created) to:
1. Read text files
2. Chunk content
3. Create embeddings
4. Load into vector store

---

## 📝 Content Format

### Example Structure:

```
# Market Data - Mumbai

## Price Trends
- Average price per sqft: ₹15,000-20,000
- Growth rate: 8% YoY
- Market condition: Stable

## Comparable Properties
- Property A: ₹2 crores, 1200 sqft
- Property B: ₹1.8 crores, 1000 sqft
```

---

## ✅ Status

**Ready for:** Content extraction and loading  
**Next:** Extract content from documents → Load into vector store
