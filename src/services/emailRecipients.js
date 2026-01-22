/**
 * Email Recipient Rules
 * As per sir's instructions: Send emails to correct recipients based on events
 */

/**
 * Get email recipients for a decision event
 */
export function getDecisionEmailRecipients(decisionType, decisionData, userEmail) {
  const recipients = [userEmail]; // Always include buyer/user

  switch (decisionType) {
    case "SELECT_AGENT":
      // When agent is accepted: Send to Buyer + Agent
      if (decisionData.selectedOption) {
        const agentEmail = decisionData.selectedOption.email || decisionData.selectedOption.contactEmail;
        if (agentEmail) {
          recipients.push(agentEmail);
        }
      }
      break;

    case "SELECT_PROPERTY":
      // When property is selected: Send to Buyer + Agent (if agent is already selected)
      // Note: Agent email would come from previous decision
      break;

    case "SELECT_LENDER":
      // When bank is selected: Send to Buyer + Bank
      if (decisionData.selectedOption) {
        const bankEmail = decisionData.selectedOption.email || decisionData.selectedOption.contactEmail;
        if (bankEmail) {
          recipients.push(bankEmail);
        }
      }
      break;

    case "DOWN_PAYMENT_STRATEGY":
      // When down payment is accepted: Send to Buyer only
      break;
  }

  return recipients.filter(email => email); // Remove null/undefined
}

/**
 * Get email recipients for action events
 */
export function getActionEmailRecipients(action, decisions, userEmail) {
  const recipients = [userEmail]; // Always include buyer/user

  // Get agent email from decisions
  const agentDecision = decisions.find(d => d.type === "SELECT_AGENT" && d.evolutionState === "CONFIRMED");
  if (agentDecision?.selectedOption?.email) {
    recipients.push(agentDecision.selectedOption.email);
  }

  // Get lender email from decisions
  const lenderDecision = decisions.find(d => d.type === "SELECT_LENDER" && d.evolutionState === "CONFIRMED");
  if (lenderDecision?.selectedOption?.email) {
    recipients.push(lenderDecision.selectedOption.email);
  }

  // For action-specific logic, check action metadata
  if (action.recipients && Array.isArray(action.recipients)) {
    recipients.push(...action.recipients);
  }

  return [...new Set(recipients.filter(email => email))]; // Remove duplicates and nulls
}

/**
 * Get email recipients for intent created
 */
export function getIntentCreatedRecipients(userEmail) {
  return [userEmail]; // Only buyer
}

/**
 * Get email recipients for compliance result
 */
export function getComplianceRecipients(userEmail) {
  return [userEmail]; // Only buyer
}

/**
 * Get email recipients for decision generated
 */
export function getDecisionGeneratedRecipients(userEmail) {
  return [userEmail]; // Only buyer
}
