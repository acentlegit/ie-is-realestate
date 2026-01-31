/**
 * Multi-Intent Parser
 * Parses multiple intents from a single input text
 * Each intent gets its own decisions and actions based on type and location
 */

// Indian cities list for location extraction (expanded)
const INDIAN_CITIES = [
  "mumbai", "bombay", "delhi", "new delhi", "bangalore", "bengaluru", "chennai", "madras",
  "hyderabad", "pune", "kolkata", "calcutta", "ahmedabad", "surat", "jaipur",
  "lucknow", "kanpur", "nagpur", "indore", "thane", "bhopal", "visakhapatnam",
  "vizag", "patna", "vadodara", "ghaziabad", "ludhiana", "agra", "nashik",
  "vijayawada", "guntur", "warangal", "raipur", "jabalpur", "coimbatore", "kochi",
  "kozhikode", "mysore", "mangalore", "hubli", "belgaum", "gulbarga", "raipur",
  "bhubaneswar", "cuttack", "ranchi", "jamshedpur", "dhanbad", "guwahati", "shillong",
  "imphal", "aizawl", "kohima", "itanagar", "gangtok", "port blair", "panaji",
  "pondicherry", "kavaratti", "daman", "diu", "chandigarh", "srinagar", "leh"
];

/**
 * Detect intent type from text
 */
export function detectIntentType(text) {
  const textLower = text.toLowerCase();
  
  // SELL keywords
  if (textLower.match(/\b(sell|selling|sale|list|listing|put on market)\b/)) {
    return "SELL_PROPERTY";
  }
  
  // RENT keywords
  if (textLower.match(/\b(rent|renting|lease|leasing|rental)\b/)) {
    return "RENT_PROPERTY";
  }
  
  // BUY keywords — e.g. "I want a house in Delhi", "Find me a home in Chennai", "Buy apartment in Hyderabad"
  if (textLower.match(/\b(buy|buying|purchase|purchasing|acquire|find|want|looking for|need|get me|show me)\b/)) {
    return "BUY_PROPERTY";
  }

  // Default to BUY_PROPERTY for real-estate context (location + budget usually means buy)
  return "BUY_PROPERTY";
}

/**
 * Extract location from text
 */
export function extractLocation(text) {
  const textLower = text.toLowerCase();
  
  // First, try direct city matching (case-insensitive, whole word or part of word)
  for (const city of INDIAN_CITIES) {
    // Match city name as whole word or as part of a word (e.g., "vijayawada" in "vijayawada")
    const cityPattern = new RegExp(`\\b${city}\\b`, 'i');
    if (cityPattern.test(textLower)) {
      // Capitalize properly (first letter of each word)
      return city.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  }
  
  // Pattern matching: "in Mumbai", "at Delhi", "for Mumbai", "in Vijayawada"
  // matchAll() requires RegExp with global (g) flag
  const locationPatterns = [
    /(?:in|at|near|around|for|under|over)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:for|with|at|in|under|over)/gi,
    // Match capitalized words that look like city names
    /\b([A-Z][a-z]{3,}(?:\s+[A-Z][a-z]+)*)\b/g
  ];
  
  for (const pattern of locationPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match && match[1]) {
        const candidate = match[1].trim();
        const nonLocations = ["home", "house", "property", "buy", "purchase", "crore", "lakh", "rupees", "dollars", "budget", "apartment", "flat", "under", "over", "for", "with"];
        // Check if it's not a common non-location word and has reasonable length
        if (!nonLocations.some(word => candidate.toLowerCase().includes(word)) && 
            candidate.length > 3 && 
            candidate.length < 30) {
          return candidate;
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract budget from text (in rupees)
 */
export function extractBudget(text) {
  const textLower = text.toLowerCase();
  
  // Match patterns like "2 crores", "1.5 crore", "80 lakhs", "60 lakh"
  const croreMatch = textLower.match(/(\d+(?:\.\d+)?)\s*crore/i);
  if (croreMatch) {
    const amount = parseFloat(croreMatch[1]);
    return Math.round(amount * 10000000); // Convert crores to rupees
  }
  
  const lakhMatch = textLower.match(/(\d+(?:\.\d+)?)\s*lakh/i);
  if (lakhMatch) {
    const amount = parseFloat(lakhMatch[1]);
    return Math.round(amount * 100000); // Convert lakhs to rupees
  }
  
  // Match patterns like "₹2L", "₹1.5L", "₹80L"
  const rupeeLakhMatch = text.match(/₹(\d+(?:\.\d+)?)L/i);
  if (rupeeLakhMatch) {
    const amount = parseFloat(rupeeLakhMatch[1]);
    return Math.round(amount * 100000);
  }
  
  // Match patterns like "₹2Cr", "₹1.5Cr"
  const rupeeCroreMatch = text.match(/₹(\d+(?:\.\d+)?)Cr/i);
  if (rupeeCroreMatch) {
    const amount = parseFloat(rupeeCroreMatch[1]);
    return Math.round(amount * 10000000);
  }
  
  return null;
}

/**
 * Parse a single intent line into structured data
 */
export function parseIntentLine(text, index = 0) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  
  const intentType = detectIntentType(trimmed);
  const location = extractLocation(trimmed);
  const budget = extractBudget(trimmed);
  
  return {
    text: trimmed,
    intentType,
    location: location || "selected location",
    budget: budget || null,
    index
  };
}

/**
 * Split input into multiple intent lines
 * Supports newlines, semicolons, and numbered lists
 */
export function splitIntoIntentLines(input) {
  // Split by newlines first
  let lines = input.split(/\n+/).map(line => line.trim()).filter(line => line.length > 0);
  
  // If no newlines, try splitting by semicolons
  if (lines.length === 1) {
    lines = input.split(/[;]+/).map(line => line.trim()).filter(line => line.length > 0);
  }
  
  // Remove numbered list prefixes (1., 2., etc.)
  lines = lines.map(line => line.replace(/^\d+[\.\)]\s*/, ""));
  
  return lines;
}

/**
 * Parse multiple intents from input text
 */
export function parseMultipleIntents(input) {
  const lines = splitIntoIntentLines(input);
  
  if (lines.length === 0) {
    return [];
  }
  
  // If only one line, return single intent
  if (lines.length === 1) {
    const parsed = parseIntentLine(lines[0], 0);
    return parsed ? [parsed] : [];
  }
  
  // Parse each line as a separate intent
  const intents = [];
  lines.forEach((line, index) => {
    const parsed = parseIntentLine(line, index);
    if (parsed) {
      intents.push(parsed);
    }
  });
  
  return intents;
}

/**
 * Create intent payload for Intent Engine
 */
export function createIntentPayload(parsedIntent, tenantId, actorId) {
  return {
    text: parsedIntent.text,
    tenantId: tenantId || "intent-platform",
    actorId: actorId || "default-user",
    industry: "real-estate",
    intentType: parsedIntent.intentType,
    extractedInfo: {
      location: parsedIntent.location,
      budget: parsedIntent.budget,
      city: parsedIntent.location,
    },
    payload: {
      location: parsedIntent.location,
      budget: parsedIntent.budget,
    }
  };
}
