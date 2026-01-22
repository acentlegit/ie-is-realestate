class R{constructor(e={}){this.baseUrl=e.baseUrl||"http://localhost:11434",this.model=e.model||"llama3",this.timeout=e.timeout||3e4}async generate(e,t){const n=`${this.baseUrl}/api/generate`,r={model:this.model,prompt:e,stream:!1};t&&(r.system=t);try{const a=new AbortController,c=setTimeout(()=>a.abort(),this.timeout),o=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r),signal:a.signal});if(clearTimeout(c),!o.ok)throw new Error(`Ollama API error: ${o.status} ${o.statusText}`);return await o.json()}catch(a){throw a.name==="AbortError"?new Error(`Ollama request timeout after ${this.timeout}ms`):new Error(`Failed to query Ollama: ${a.message}`)}}async healthCheck(){try{return(await fetch(`${this.baseUrl}/api/tags`,{method:"GET",signal:AbortSignal.timeout(5e3)})).ok}catch{return!1}}async listModels(){var e;try{const t=await fetch(`${this.baseUrl}/api/tags`,{method:"GET"});if(!t.ok)throw new Error(`Failed to list models: ${t.statusText}`);return((e=(await t.json()).models)==null?void 0:e.map(r=>r.name))||[]}catch(t){throw new Error(`Failed to list Ollama models: ${t.message}`)}}}class w{constructor(e){if(!e.backendUrl)throw new Error("BackendVectorStore requires backendUrl");this.backendUrl=e.backendUrl,this.apiKey=e.apiKey}async add(e){const t=await fetch(`${this.backendUrl}/api/v1/vector-store/add`,{method:"POST",headers:{"Content-Type":"application/json",...this.apiKey&&{Authorization:`Bearer ${this.apiKey}`}},body:JSON.stringify({documents:e})});if(!t.ok)throw new Error(`Failed to add documents: ${t.statusText}`)}async search(e,t=5,n){const r=await fetch(`${this.backendUrl}/api/v1/vector-store/search`,{method:"POST",headers:{"Content-Type":"application/json",...this.apiKey&&{Authorization:`Bearer ${this.apiKey}`}},body:JSON.stringify({query:e,k:t,filter:n})});if(!r.ok)throw new Error(`Failed to search: ${r.statusText}`);return await r.json()}async delete(e){const t=await fetch(`${this.backendUrl}/api/v1/vector-store/delete`,{method:"POST",headers:{"Content-Type":"application/json",...this.apiKey&&{Authorization:`Bearer ${this.apiKey}`}},body:JSON.stringify({ids:e})});if(!t.ok)throw new Error(`Failed to delete documents: ${t.statusText}`)}async getStats(){const e=await fetch(`${this.backendUrl}/api/v1/vector-store/stats`,{method:"GET",headers:{...this.apiKey&&{Authorization:`Bearer ${this.apiKey}`}}});if(!e.ok)throw new Error(`Failed to get stats: ${e.statusText}`);return await e.json()}}class S{constructor(){this.documents=new Map}async add(e){e.forEach(t=>{this.documents.set(t.id,t)})}async search(e,t=5,n){const r=Array.from(this.documents.values()).filter(a=>n?Object.entries(n).every(([c,o])=>{var l;return((l=a.metadata)==null?void 0:l[c])===o}):!0).filter(a=>a.text.toLowerCase().includes(e.toLowerCase())).slice(0,t);return{ids:[r.map(a=>a.id)],documents:[r.map(a=>a.text)],metadatas:[r.map(a=>a.metadata)],distances:[r.map(()=>.5)]}}async delete(e){e.forEach(t=>this.documents.delete(t))}async getStats(){return{count:this.documents.size}}}class O{static create(e){return e.backendUrl?new w(e):(console.warn("[VectorStore] No backendUrl provided, using MockVectorStore"),new S)}}class f{constructor(e,t,n,r,a){this.ADVISORY_THRESHOLD=.7,this.country=e,this.name=t,this.version=n,this.ollamaClient=new R(r),this.vectorStore=O.create(a||{backendUrl:void 0})}getMetadata(){return{country:this.country,name:this.name,version:this.version,supported_intent_types:this.getSupportedIntentTypes()}}buildUserPrompt(e,t=[]){const n=t.length>0?`

Relevant Knowledge Base Context:
${t.map((r,a)=>`${a+1}. ${r}`).join(`
`)}`:`

Note: No relevant documents found in knowledge base. Proceed with general knowledge.`;return`
Intent Type: ${e.intent_type}
Extracted Entities: ${JSON.stringify(e.extracted_entities,null,2)}
Country: ${e.country}
${e.context?`Additional Context: ${JSON.stringify(e.context,null,2)}`:""}

Task:
1. Retrieve relevant knowledge from the knowledge base
2. Provide market context
3. Identify risk signals (advisory only)
4. Suggest valuation hints (advisory only)
5. Cite all sources

Important:
- You provide ADVISORY information only
- You do NOT make decisions
- You do NOT execute actions
- All outputs must be factual and source-cited

Output Format: Return a valid JSON object matching this schema:
{
  "summary": "string",
  "market_context": {
    "location_insights": "string",
    "price_trends": "string",
    "market_conditions": "string",
    "comparable_properties": "string (optional)"
  },
  "risk_signals": [
    {
      "type": "PRICE" | "LOCATION" | "LEGAL" | "MARKET",
      "severity": "LOW" | "MEDIUM" | "HIGH",
      "description": "string",
      "source": "string"
    }
  ],
  "valuation_hint": {
    "estimated_range": "string (optional)",
    "factors": ["string"],
    "methodology": "string",
    "confidence": 0.0-1.0
  },
  "sources": [
    {
      "type": "GOVERNMENT" | "MARKET_DATA" | "REGULATORY" | "THIRD_PARTY",
      "name": "string",
      "url": "string (optional)",
      "date": "ISO 8601 string"
    }
  ],
  "country": "${this.country}",
  "confidence": 0.0-1.0,
  "retrieval_timestamp": "ISO 8601 string",
  "model_version": "string"
}
${n}`}parseOllamaResponse(e,t,n=[]){var r,a,c,o,l,m,p,h;try{const g=(e.response||"").match(/\{[\s\S]*\}/);if(!g)throw new Error("No JSON found in Ollama response");const s=JSON.parse(g[0]),d=Math.max(0,Math.min(1,s.confidence||.5)),A={summary:s.summary||"No summary available",market_context:{location_insights:((r=s.market_context)==null?void 0:r.location_insights)||"",price_trends:((a=s.market_context)==null?void 0:a.price_trends)||"",market_conditions:((c=s.market_context)==null?void 0:c.market_conditions)||"",comparable_properties:(o=s.market_context)==null?void 0:o.comparable_properties},risk_signals:s.risk_signals||[],valuation_hint:{estimated_range:(l=s.valuation_hint)==null?void 0:l.estimated_range,factors:((m=s.valuation_hint)==null?void 0:m.factors)||[],methodology:((p=s.valuation_hint)==null?void 0:p.methodology)||"",confidence:Math.max(0,Math.min(1,((h=s.valuation_hint)==null?void 0:h.confidence)||.5))},sources:s.sources||this.extractSourcesFromDocuments(n),country:s.country||this.country,confidence:d,retrieval_timestamp:s.retrieval_timestamp||new Date().toISOString(),model_version:s.model_version||e.model||"unknown"};return d<this.ADVISORY_THRESHOLD&&console.warn(`[RAG Adapter ${this.name}] Low confidence response (${d.toFixed(2)} < ${this.ADVISORY_THRESHOLD}). Marking as advisory-only.`),A}catch(y){throw new Error(`Failed to parse Ollama response: ${y.message}`)}}async retrieveRelevantDocuments(e){try{const t=this.buildSearchQuery(e);return(await this.vectorStore.search(t,5,{country:this.country})).documents[0]||[]}catch(t){return console.warn(`[RAG Adapter ${this.name}] Vector store retrieval failed:`,t),[]}}buildSearchQuery(e){const t=Object.entries(e.extracted_entities||{}).filter(([n,r])=>n!=="country"&&r&&typeof r=="string"&&r.length>0).map(([n,r])=>`${n}: ${r}`).join(", ");return`${e.intent_type} ${t}`.trim()}async executeQuery(e){try{const t=await this.retrieveRelevantDocuments(e);if(!await this.ollamaClient.healthCheck())throw new Error("Ollama service is not available");const r=this.buildSystemPrompt(),a=this.buildUserPrompt(e,t),c=await this.ollamaClient.generate(a,r);return this.parseOllamaResponse(c,e,t)}catch(t){return console.error(`[RAG Adapter ${this.name}] Query failed:`,t),{summary:`RAG query failed: ${t.message}. Please proceed with engine-only analysis.`,market_context:{location_insights:"",price_trends:"",market_conditions:""},risk_signals:[],valuation_hint:{factors:[],methodology:"Engine-only (RAG unavailable)",confidence:0},sources:[],country:this.country,confidence:0,retrieval_timestamp:new Date().toISOString(),model_version:"error"}}}shouldUseRAGResponse(e){return e.confidence>=this.ADVISORY_THRESHOLD}getAdvisoryFlag(e){return e.confidence>=.9?"HIGH_CONFIDENCE":e.confidence>=this.ADVISORY_THRESHOLD?"MEDIUM_CONFIDENCE":"LOW_CONFIDENCE"}extractSourcesFromDocuments(e){return e.length===0?[]:[{type:"MARKET_DATA",name:`${this.country} Knowledge Base`,date:new Date().toISOString().split("T")[0]}]}}class E extends f{constructor(e,t){super("IN","India RAG Adapter","1.0.0",e,t)}getSupportedIntentTypes(){return["BUY_PROPERTY","SELL_PROPERTY","RENT_PROPERTY","VALUATION"]}buildSystemPrompt(){return`You are a knowledge retrieval assistant for the Universal Intent Platform, specialized in Indian real estate.

Country-Specific Context:
- Use Indian property databases and government sources
- Reference RERA (Real Estate Regulatory Authority) regulations
- Use INR (₹) currency format
- Consider Indian market trends and city-specific data
- Reference Indian legal frameworks (RERA, FEMA, state-specific laws)

Data Sources Priority:
1. RERA state portals (e.g., RERA Andhra Pradesh, RERA Maharashtra)
2. Municipal corporation records
3. NHB (National Housing Bank) indices
4. Local market reports and property portals (99acres, MagicBricks)
5. Government land registry information

Output Requirements:
- All prices in INR (lakhs/crores format)
- Reference Indian cities and states correctly
- Cite RERA registration when relevant
- Include Indian market trends (tier-1, tier-2, tier-3 cities)
- Use Indian date formats and legal terminology

Remember:
- You provide ADVISORY information only
- You do NOT make compliance decisions (Compliance Engine does)
- You do NOT select agents (Decision Engine does)
- All information must be factual and source-cited`}async query(e){if(e.country!=="IN"&&e.country!=="INDIA")throw new Error(`India RAG Adapter only supports country "IN", got "${e.country}"`);return await this.executeQuery(e)}}class _ extends f{constructor(e,t){super("US","US RAG Adapter","1.0.0",e,t)}getSupportedIntentTypes(){return["BUY_PROPERTY","SELL_PROPERTY","RENT_PROPERTY","VALUATION"]}buildSystemPrompt(){return`You are a knowledge retrieval assistant for the Universal Intent Platform, specialized in US real estate.

Country-Specific Context:
- Use US property databases (MLS, Zillow, Redfin)
- Reference county assessor records
- Use USD ($) currency format
- Consider US market trends and city-specific data
- Reference US legal frameworks (state-specific real estate laws)

Data Sources Priority:
1. MLS (Multiple Listing Service) data
2. County assessor records
3. Zillow/Redfin APIs and market data
4. Census data and demographic information
5. Local market reports and real estate portals

Output Requirements:
- All prices in USD ($)
- Reference US cities and states correctly
- Cite MLS listings when relevant
- Include US market trends (metro areas, suburbs, rural)
- Use US date formats and legal terminology
- Reference school districts, property taxes, HOA fees when relevant

Remember:
- You provide ADVISORY information only
- You do NOT make compliance decisions (Compliance Engine does)
- You do NOT select agents (Decision Engine does)
- All information must be factual and source-cited`}async query(e){if(e.country!=="US"&&e.country!=="USA")throw new Error(`US RAG Adapter only supports country "US", got "${e.country}"`);return await this.executeQuery(e)}}class k{constructor(e){this.adapters=new Map,this.defaultConfig=e,this.initializeAdapters()}initializeAdapters(){const e=new E(this.defaultConfig);this.adapters.set("IN",e),this.adapters.set("INDIA",e);const t=new _(this.defaultConfig);this.adapters.set("US",t),this.adapters.set("USA",t)}getAdapter(e){const t=e.toUpperCase();return this.adapters.get(t)||null}async query(e){const t=this.getAdapter(e.country);if(!t)return console.warn(`[RAG Factory] No adapter found for country: ${e.country}`),null;try{return await t.query(e)}catch(n){return console.error("[RAG Factory] Query failed:",n),null}}getAvailableAdapters(){return Array.from(this.adapters.keys())}hasAdapter(e){return this.getAdapter(e)!==null}}let u=null;function v(i){return u||(u=new k(i)),u}export{k as RAGFactory,v as getRAGFactory};
