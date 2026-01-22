/**
 * Phase 13.1: Voice Command Parser
 * Parses voice commands into structured actions
 */

/**
 * Parse voice command into structured action
 * @param {string} rawCommand - Raw voice command text
 * @returns {Object} Parsed command object
 */
/**
 * Normalize command text for better speech recognition matching
 * Handles common transcription errors and variations
 */
function normalizeCommand(rawCommand) {
  let normalized = rawCommand.toLowerCase().trim();
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, " ");
  
  // Common speech recognition variations (single words only)
  const replacements = {
    "won": "one",
    "to": "two",
    "for": "four",
    "ate": "eight",
    "reed": "read",
    "red": "read",
    "decisive": "decision",
    "explain": "explanation",
    "comply": "compliance",
    "risky": "risk",
    "step": "step",
    "steps": "step",
  };
  
  // Note: "scroll down" mis-transcription of "read decision" is handled
  // contextually in Intent.jsx, not here in normalization
  
  // Apply replacements
  Object.entries(replacements).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, "gi");
    normalized = normalized.replace(regex, correct);
  });
  
  return normalized;
}

export function parseVoiceCommand(rawCommand) {
  // Phase 13.4: Improved normalization for better reliability
  const command = normalizeCommand(rawCommand);
  
  console.log("[Voice Command Parser] Parsing command:", command);
  console.log("[Voice Command Parser] Raw command (for debugging):", rawCommand);
  
  // Phase 13.4: CRITICAL FIX - Handle common mis-transcriptions
  // Speech recognition often transcribes "read decision" as "scroll down"
  // We need to check for this BEFORE checking scroll commands
  // If user recently said "read" or we're in a context where read is expected,
  // treat "scroll down" as potentially "read decision"
  // For now, we'll be more aggressive: if command is just "scroll down" and very short,
  // check if it might be a read command first
  
  // Phase 13.4: Check read commands FIRST (before scroll) to avoid mis-matching
  // "read decision one" might be transcribed as "scroll down" by speech recognition
  // So we check for "read" patterns first
  
  // Phase 13.4: Improved "read decision" matching with better reliability
  // Handle multiple variations: "read decision", "read decision one", "read first decision", etc.
  // ALSO handle common mis-transcriptions: "red decision", "reed decision", etc.
  if (command.includes("read") || command.includes("red") || command.includes("reed") ||
      (command.includes("recent") && (command.includes("one") || command.includes("1") || command.includes("two") || command.includes("2"))) ||
      (command.includes("read") && (command.includes("first") || command.includes("second") || command.includes("third"))) ||
      (command.includes("red") && command.includes("decision")) || // "red decision" (mis-transcription)
      (command.includes("reed") && command.includes("decision"))) { // "reed decision" (mis-transcription)
    // Check if it's a read decision command - "read decision" (with or without number/label)
    // Phase 13.4: More robust matching for "read decision"
    // Also check for mis-transcriptions: "red decision", "reed decision"
    const isReadDecision = (command.includes("read") && (command.includes("decision") || command.includes("recent"))) ||
                           (command.includes("red") && command.includes("decision")) || // "red decision"
                           (command.includes("reed") && command.includes("decision")) || // "reed decision"
                           (command.includes("read") && (command.includes("first") || command.includes("second") || command.includes("third")) && !command.includes("action"));
    
    if (isReadDecision) {
      // Extract identifier (number or keyword) - optional
      // Phase 13.4: Improved regex patterns to catch more variations
      let decisionMatch = command.match(/read\s+(?:the\s+)?(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\s+decision/i) ||
                          command.match(/read\s+decision\s+(one|won|two|to|three|four|five|1|2|3|4|5|first|second|third|agent|property|bank|loan)/i) ||
                          command.match(/read\s+(agent|property|bank|loan)\s+decision/i) ||
                          command.match(/read\s+recent\s+(one|won|two|to|three|four|five|1|2|3|4|5)/i) || // Handle "read recent one"
                          command.match(/read\s+(?:the\s+)?decision/i); // Simple "read decision" or "read the decision"
      
      let identifier = null;
      if (decisionMatch) {
        identifier = decisionMatch[1] ? decisionMatch[1].toLowerCase() : null;
        // Normalize speech recognition variations
        if (identifier) {
          const numberMap = {
            "won": "one", "to": "two", "for": "four",
            "first": "one", "1st": "one",
            "second": "two", "2nd": "two",
            "third": "three", "3rd": "three",
            "fourth": "four", "4th": "four",
            "fifth": "five", "5th": "five"
          };
          identifier = numberMap[identifier] || identifier;
        }
      }
      
      console.log("[Voice Command Parser] Matched: read decision", identifier || "(most recent)");
      return {
        type: "read",
        target: "decision",
        identifier: identifier,
        confirmation: false,
        action: "read_decision"
      };
    }
    
    // Check for other read commands
    if (command.includes("read") && command.includes("action")) {
      const actionMatch = command.match(/read\s+action\s+(one|two|three|four|five|1|2|3|4|5|[a-z\s]+?)(?:\s+action|$)/i);
      const identifier = actionMatch ? actionMatch[1].trim().toLowerCase() : null;
      console.log("[Voice Command Parser] Matched: read action", identifier || "(most recent)");
      return {
        type: "read",
        target: "action",
        identifier: identifier,
        confirmation: false,
        action: "read_action"
      };
    }
    
    if ((command.includes("read") && command.includes("explanation")) ||
        (command.includes("read") && command.includes("why")) ||
        command.includes("why was this recommended") ||
        command.includes("explain this")) {
      console.log("[Voice Command Parser] Matched: read explanation");
      return {
        type: "read",
        target: "explanation",
        identifier: null,
        confirmation: false,
        action: "read_explanation"
      };
    }
    
    if ((command.includes("read") && (command.includes("intent") || command.includes("summary"))) ||
        command.includes("what is my intent") ||
        command.includes("read my intent")) {
      console.log("[Voice Command Parser] Matched: read intent");
      return {
        type: "read",
        target: "intent",
        identifier: null,
        confirmation: false,
        action: "read_intent"
      };
    }
    
    // Phase 13.4: "read compliance result" / "read compliance"
    if (command.includes("read") && command.includes("compliance")) {
      console.log("[Voice Command Parser] Matched: read compliance");
      return {
        type: "read",
        target: "compliance",
        identifier: null,
        confirmation: false,
        action: "read_compliance"
      };
    }
    
    // Phase 13.4: "read risk" / "read risk result" / "read risk assessment"
    if (command.includes("read") && command.includes("risk")) {
      console.log("[Voice Command Parser] Matched: read risk");
      return {
        type: "read",
        target: "risk",
        identifier: null,
        confirmation: false,
        action: "read_risk"
      };
    }
    
    // Phase 13.4: "read next step" / "read next steps" / "what's next"
    if ((command.includes("read") && (command.includes("next") || command.includes("step"))) ||
        command.includes("what's next") || command.includes("what is next") || command.includes("what are the next steps")) {
      console.log("[Voice Command Parser] Matched: read next step");
      return {
        type: "read",
        target: "next_step",
        identifier: null,
        confirmation: false,
        action: "read_next_step"
      };
    }
    
    // "read this", "read current", "read recent", "read it"
    if ((command.includes("read") && (command.includes("this") || command.includes("current") || command.includes("recent") || command.includes("it"))) ||
        command.includes("what does this say") || command.includes("what does it say")) {
      console.log("[Voice Command Parser] Matched: read current");
      return {
        type: "read",
        target: "current",
        identifier: null,
        confirmation: false,
        action: "read_current"
      };
    }
  }
  
  // Navigation commands (Phase 13.1) - Check AFTER read commands
  // Support multiple variations: "scroll up/down", "go up/down", "move up/down"
  
  // IMPORTANT: Check for "read" commands FIRST before scroll commands
  // This prevents "read decision" from being mis-matched as "scroll down"
  
  // Scroll UP commands (check first to avoid false matches, but after read commands)
  // Make sure it's actually "scroll up" and not part of "read" command
  // Handle variations: "scroll up", "go up", "move up", "scroll upward"
  // Phase 13.4: Added synonyms for better reliability
  // STRICT CHECK: Must explicitly contain "up" and NOT contain "down"
  // FIX: More flexible matching to handle speech recognition variations
  const trimmedCommand = command.trim();
  const hasScrollUp = (command.includes("scroll") && command.includes("up") && !command.includes("down")) ||
                      (/^go\s+up$/i.test(trimmedCommand)) || // "go up" (exact match with word boundaries)
                      (/^move\s+up$/i.test(trimmedCommand)) || // "move up" (exact match with word boundaries)
                      (command.includes("scroll upward") && !command.includes("down")) ||
                      (/scroll\s+up\b/i.test(command) && !command.includes("down"));
  
  if (hasScrollUp) {
    console.log("[Voice Command Parser] Matched: scroll up (command:", command, ")");
    return { 
      type: "scroll", 
      direction: "up", 
      confirmation: false,
      action: "scroll_up"
    };
  }
  
  // Scroll DOWN commands
  // CRITICAL FIX: "read decision" is often mis-transcribed as "scroll down"
  // We need to check if this might actually be a read command
  // Strategy: If command is exactly "scroll down" (very common mis-transcription),
  // check if user might have meant "read decision" by looking for context clues
  // For now, we'll add a special handler: if it's just "scroll down" with no other words,
  // and we're in a context where decisions exist, we'll treat it as ambiguous
  // But for now, let's be conservative and only match clear scroll commands
  
  // Phase 13.4: Added synonyms for better reliability
  // STRICT CHECK: Must explicitly contain "down" and NOT contain "up"
  // FIX: More flexible matching to handle speech recognition variations
  const trimmedCommandDown = command.trim();
  const hasScrollDown = (command.includes("scroll") && command.includes("down") && !command.includes("up")) ||
                        (/^go\s+down$/i.test(trimmedCommandDown)) || // "go down" (exact match with word boundaries)
                        (/^move\s+down$/i.test(trimmedCommandDown)) || // "move down" (exact match with word boundaries)
                        (command.includes("scroll downward") && !command.includes("up")) ||
                        (/scroll\s+down\b/i.test(command) && !command.includes("up"));
  
  // Phase 13.4: Special handling for "scroll down" that might be "read decision"
  // If command is exactly "scroll down" (common mis-transcription of "read decision"),
  // we'll check if there's a way to detect this. For now, we'll log it for debugging.
  if (command.trim() === "scroll down" || command.trim() === "scrolldown") {
    console.warn("[Voice Command Parser] WARNING: 'scroll down' detected - this might be a mis-transcription of 'read decision'");
    console.log("[Voice Command Parser] If you said 'read decision', the speech recognition may have mis-transcribed it.");
    // We'll still treat it as scroll down for now, but log the warning
  }
  
  if (hasScrollDown) {
    console.log("[Voice Command Parser] Matched: scroll down (command:", command, ")");
    return { 
      type: "scroll", 
      direction: "down", 
      confirmation: false,
      action: "scroll_down"
    };
  }
  
  // Phase 13.2: Decision commands (with confirmation required)
  // "select agent a", "select agent 1", "choose property 2", etc.
  if (command.includes("select") || command.includes("choose")) {
    // Extract the option name/number
    // Patterns: "select agent a", "select agent 1", "choose property 2", "select option 1"
    const optionMatch = command.match(/(?:select|choose)\s+(?:agent|property|option|bank|loan)\s*([a-z0-9]+)/i) ||
                       command.match(/(?:select|choose)\s+([a-z0-9]+)/i);
    
    if (optionMatch) {
      const option = optionMatch[1].toLowerCase();
      console.log("[Voice Command Parser] Matched: select decision option:", option);
      return {
        type: "select_decision",
        option: option,
        confirmation: true,
        action: "select_decision"
      };
    }
  }
  
  // "confirm decision" or "confirm selection"
  if (command.includes("confirm") && (command.includes("decision") || command.includes("selection"))) {
    console.log("[Voice Command Parser] Matched: confirm decision");
    return {
      type: "confirm_decision",
      confirmation: false, // This is the confirmation itself
      action: "confirm_decision"
    };
  }
  
  // Phase 13.3: Action commands (with confirmation required)
  // "mark action [name] as completed", "mark action 1 as completed", "complete action [name]"
  if ((command.includes("mark") && command.includes("action") && command.includes("as")) ||
      (command.includes("complete") && command.includes("action")) ||
      (command.includes("skip") && command.includes("action")) ||
      (command.includes("fail") && command.includes("action"))) {
    
    // Extract outcome type
    let outcomeType = null;
    if (command.includes("completed") || command.includes("complete")) {
      outcomeType = "COMPLETED";
    } else if (command.includes("failed") || command.includes("fail")) {
      outcomeType = "FAILED";
    } else if (command.includes("skipped") || command.includes("skip")) {
      outcomeType = "SKIPPED";
    } else if (command.includes("blocked") || command.includes("block")) {
      outcomeType = "BLOCKED";
    } else if (command.includes("rescheduled") || command.includes("reschedule")) {
      outcomeType = "RESCHEDULED";
    }
    
    // Extract action identifier (name or number)
    // Patterns: "mark action talk to agent as completed", "mark action 1 as completed", "complete action site visit"
    const actionMatch = command.match(/(?:mark|complete|skip|fail)\s+action\s+([a-z0-9\s]+?)(?:\s+as|\s+completed|\s+failed|\s+skipped|$)/i) ||
                       command.match(/action\s+([a-z0-9\s]+?)(?:\s+as|\s+completed|\s+failed|\s+skipped|$)/i);
    
    if (outcomeType && actionMatch) {
      const actionIdentifier = actionMatch[1].trim().toLowerCase();
      console.log("[Voice Command Parser] Matched: update action outcome:", actionIdentifier, outcomeType);
      return {
        type: "update_action_outcome",
        actionIdentifier: actionIdentifier,
        outcomeType: outcomeType,
        confirmation: true,
        action: "update_action_outcome"
      };
    }
  }
  
  // "cancel" command
  if (command === "cancel" || command === "abort") {
    console.log("[Voice Command Parser] Matched: cancel");
    return {
      type: "cancel",
      confirmation: false,
      action: "cancel"
    };
  }
  
  // Unknown command - will be handled as intent input (existing behavior)
  console.log("[Voice Command Parser] No match - treating as intent input");
  return { 
    type: "unknown", 
    confirmation: false,
    action: null
  };
}

/**
 * Check if command is a navigation command (no confirmation needed)
 */
export function isNavigationCommand(parsedCommand) {
  return parsedCommand.type === "scroll";
}
