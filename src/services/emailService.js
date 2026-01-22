/**
 * Email Service - SendGrid Integration
 * 
 * Sequential Action Flow + Email Automation
 * - Every action status change triggers an email
 * - Actions execute in strict order (one after another)
 * - Initial confirmation email when all 4 decisions are made
 */

const EMAIL_SERVICE_URL = import.meta.env.VITE_EMAIL_SERVICE_URL || "http://localhost:7008";

/**
 * Email Templates - Phase 3: All 9 Email Trigger Points
 */
const EMAIL_TEMPLATES = {
  // 1. Intent Created
  INTENT_CREATED: "INTENT_CREATED",
  
  // 2. Compliance Check Result
  COMPLIANCE_RESULT: "COMPLIANCE_RESULT",
  
  // 3. Decision Generated
  DECISION_GENERATED: "DECISION_GENERATED",
  
  // 4. Decision Confirmed (Individual)
  DECISION_CONFIRMED: "DECISION_CONFIRMED",
  
  // 5. All Decisions Confirmed (Initial Confirmation)
  INITIAL_CONFIRMATION: "INITIAL_CONFIRMATION",
  
  // 6. Decision Changed
  DECISION_CHANGED: "DECISION_CHANGED",
  
  // 7. Action Created
  ACTION_CREATED: "ACTION_CREATED",
  
  // 8. Action Status Change (COMPLETED, CONFIRMED, FAILED, RESCHEDULED)
  ACTION_COMPLETED: "ACTION_COMPLETED",
  ACTION_CONFIRMED: "ACTION_CONFIRMED",
  ACTION_FAILED: "ACTION_FAILED",
  ACTION_RESCHEDULED: "ACTION_RESCHEDULED",
  
  // 9. Intent Completed
  INTENT_COMPLETED: "INTENT_COMPLETED",
};

/**
 * Get email template based on action status
 */
function getEmailTemplate(status) {
  switch (status) {
    case "COMPLETED":
      return EMAIL_TEMPLATES.ACTION_COMPLETED;
    case "CONFIRMED":
      return EMAIL_TEMPLATES.ACTION_CONFIRMED;
    case "FAILED":
      return EMAIL_TEMPLATES.ACTION_FAILED;
    case "RESCHEDULED":
      return EMAIL_TEMPLATES.ACTION_RESCHEDULED;
    default:
      return null;
  }
}

/**
 * Send email via backend email service
 * This is non-blocking - email failures should not block the action flow
 * Phase 3: Added DOCX generation support and multiple recipients
 */
export async function sendEmail({ to, template, data, subject, html, text, generateDocx = false }) {
  console.log(`[Email Service] Attempting to send email - Template: ${template}, To: ${Array.isArray(to) ? to.join(", ") : to}, URL: ${EMAIL_SERVICE_URL}`);
  try {
    // Support both single email and array of emails
    const recipients = Array.isArray(to) ? to : [to];
    
    // Send to all recipients (non-blocking)
    const emailPromises = recipients.map(recipient => 
      fetch(`${EMAIL_SERVICE_URL}/v1/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: recipient,
          template,
          data,
          subject,
          html,
          text,
          generateDocx, // Phase 3: Enable DOCX generation
        }),
      })
    );
    
    const responses = await Promise.allSettled(emailPromises);
    
    // Process results
    const results = await Promise.all(
      responses.map(async (response, idx) => {
        if (response.status === "fulfilled") {
          const res = response.value;
          if (res.ok) {
            const result = await res.json();
            return { success: true, recipient: recipients[idx], result };
          } else {
            const errorText = await res.text();
            return { success: false, recipient: recipients[idx], error: errorText };
          }
        } else {
          return { success: false, recipient: recipients[idx], error: response.reason };
        }
      })
    );
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    if (successful > 0) {
      console.log(`[Email Service] Email sent successfully: ${template} to ${successful} recipient(s)`);
    }
    if (failed > 0) {
      console.warn(`[Email Service] Failed to send ${template} to ${failed} recipient(s)`);
    }
    
    return { success: successful > 0, results };

  } catch (error) {
    // Non-blocking: email failures should not block actions
    const errorMsg = error.message || String(error);
    if (errorMsg.includes("fetch") || errorMsg.includes("ECONNREFUSED")) {
      console.warn(`[Email Service] Email service not available (non-blocking): ${errorMsg}`);
    } else {
      console.warn(`[Email Service] Error sending email (non-blocking): ${errorMsg}`);
    }
    return { success: false, error: errorMsg };
  }
}

/**
 * Send initial confirmation email when all 4 decisions are made
 * Agent, Lender, Property, Down Payment
 */
export async function sendInitialConfirmationEmail({ userEmail, agent, lender, property, downPayment, intentId }) {
  const subject = "✅ Intent Confirmation - Your Selections";
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Intent Confirmation</h2>
      <p>Your selections have been confirmed:</p>
      <ul style="line-height: 1.8;">
        <li><strong>Agent:</strong> ${agent || "Not selected"}</li>
        <li><strong>Lender:</strong> ${lender || "Not selected"}</li>
        <li><strong>Property:</strong> ${property || "Not selected"}</li>
        <li><strong>Down Payment:</strong> ${downPayment || "Not selected"}</li>
      </ul>
      <p style="margin-top: 20px; color: #6b7280;">
        Your intent ID: <code>${intentId}</code>
      </p>
      <p style="margin-top: 20px;">
        You will receive email notifications for each action as they progress.
      </p>
    </div>
  `;

  const text = `
Intent Confirmation

Your selections have been confirmed:
- Agent: ${agent || "Not selected"}
- Lender: ${lender || "Not selected"}
- Property: ${property || "Not selected"}
- Down Payment: ${downPayment || "Not selected"}

Intent ID: ${intentId}

You will receive email notifications for each action as they progress.
  `;

  return sendEmail({
    to: userEmail,
    template: EMAIL_TEMPLATES.INITIAL_CONFIRMATION,
    subject,
    html,
    text,
    data: {
      agent,
      lender,
      property,
      downPayment,
      intentId,
    },
  });
}

/**
 * Send action status change email
 * Triggered immediately when action status changes
 */
export async function sendActionStatusEmail({ userEmail, action, status, reason, scheduledFor, intentId }) {
  const template = getEmailTemplate(status);
  if (!template) {
    console.warn(`[Email Service] No email template for status: ${status}`);
    return { success: false, error: "Unknown status" };
  }

  const statusEmoji = {
    COMPLETED: "✅",
    CONFIRMED: "✅",
    FAILED: "❌",
    RESCHEDULED: "🔄",
  }[status] || "📋";

  const statusText = {
    COMPLETED: "Completed",
    CONFIRMED: "Confirmed",
    FAILED: "Failed",
    RESCHEDULED: "Rescheduled",
  }[status] || status;

  const subject = `${statusEmoji} Action ${statusText}: ${action.description || action.name || "Action"}`;

  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${status === "COMPLETED" || status === "CONFIRMED" ? "#16a34a" : status === "FAILED" ? "#dc2626" : "#d97706"};">
        ${statusEmoji} Action ${statusText}
      </h2>
      <p><strong>Action:</strong> ${action.description || action.name || "Action"}</p>
  `;

  if (reason) {
    html += `<p><strong>Reason:</strong> ${reason}</p>`;
  }

  if (scheduledFor) {
    html += `<p><strong>Scheduled For:</strong> ${new Date(scheduledFor).toLocaleString()}</p>`;
  }

  html += `
      <p style="margin-top: 20px; color: #6b7280;">
        Intent ID: <code>${intentId}</code>
      </p>
      <p style="margin-top: 20px;">
        ${status === "COMPLETED" || status === "CONFIRMED" 
          ? "The next action in your workflow will now be unlocked." 
          : status === "RESCHEDULED"
          ? "This action has been rescheduled. You will be notified when it's time to proceed."
          : "Please review and take necessary action."}
      </p>
    </div>
  `;

  const text = `
${statusEmoji} Action ${statusText}

Action: ${action.description || action.name || "Action"}
${reason ? `Reason: ${reason}\n` : ""}${scheduledFor ? `Scheduled For: ${new Date(scheduledFor).toLocaleString()}\n` : ""}
Intent ID: ${intentId}

${status === "COMPLETED" || status === "CONFIRMED" 
  ? "The next action in your workflow will now be unlocked." 
  : status === "RESCHEDULED"
  ? "This action has been rescheduled. You will be notified when it's time to proceed."
  : "Please review and take necessary action."}
  `;

  return sendEmail({
    to: userEmail,
    template,
    subject,
    html,
    text,
    data: {
      actionId: action.actionId || action.id,
      actionName: action.description || action.name,
      status,
      reason,
      scheduledFor,
      intentId,
    },
  });
}

/**
 * Decision Ordering (As Per Sir's Instructions)
 * Correct order: Property → Agent → Bank → Down Payment
 */
export const DECISION_ORDER = {
  "SELECT_PROPERTY": 1,
  "SELECT_AGENT": 2,
  "SELECT_LENDER": 3,
  "DOWN_PAYMENT_STRATEGY": 4,
};

/**
 * Sort decisions by correct order
 */
export function sortDecisionsByOrder(decisions) {
  return [...decisions].sort((a, b) => {
    const orderA = DECISION_ORDER[a.type] || 999;
    const orderB = DECISION_ORDER[b.type] || 999;
    return orderA - orderB;
  });
}

/**
 * Check if all 4 critical decisions are confirmed
 * Property → Agent → Bank → Down Payment (correct order)
 */
export function areAllDecisionsConfirmed(decisions) {
  const requiredTypes = ["SELECT_PROPERTY", "SELECT_AGENT", "SELECT_LENDER", "DOWN_PAYMENT_STRATEGY"];
  
  const confirmedDecisions = decisions.filter(
    (d) => d.evolutionState === "CONFIRMED" && requiredTypes.includes(d.type)
  );

  return confirmedDecisions.length === requiredTypes.length;
}

/**
 * Extract decision values for initial confirmation email
 */
export function extractDecisionValues(decisions) {
  const values = {
    agent: null,
    lender: null,
    property: null,
    downPayment: null,
  };

  decisions.forEach((decision) => {
    if (decision.evolutionState === "CONFIRMED" && decision.selectedOptionId) {
      const selectedOption = decision.options?.find((opt) => opt.id === decision.selectedOptionId);
      const label = selectedOption?.label || selectedOption?.id || decision.selectedOptionId;

      switch (decision.type) {
        case "SELECT_PROPERTY":
          values.property = label;
          break;
        case "SELECT_AGENT":
          values.agent = label;
          break;
        case "SELECT_LENDER":
          values.lender = label;
          break;
        case "DOWN_PAYMENT_STRATEGY":
          values.downPayment = label;
          break;
      }
    }
  });

  return values;
}

/**
 * Phase 3: Email Trigger 1 - Intent Created/Analyzed
 */
export async function sendIntentCreatedEmail({ userEmail, intent, intentId }) {
  const subject = "🔍 Intent Created - Analysis Complete";
  
  const intentType = intent.type || "Property Intent";
  const location = intent.payload?.location || intent.extractedInfo?.location || "Not specified";
  const budget = intent.payload?.budget ? `₹${(intent.payload.budget / 100000).toFixed(0)}L` : "Not specified";
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Intent Created</h2>
      <p>Your intent has been successfully analyzed:</p>
      <ul style="line-height: 1.8;">
        <li><strong>Intent Type:</strong> ${intentType}</li>
        <li><strong>Location:</strong> ${location}</li>
        <li><strong>Budget:</strong> ${budget}</li>
      </ul>
      <p style="margin-top: 20px; color: #6b7280;">
        Intent ID: <code>${intentId}</code>
      </p>
      <p style="margin-top: 20px;">
        Next steps: Compliance check and decision generation will follow.
      </p>
    </div>
  `;

  const text = `
Intent Created

Your intent has been successfully analyzed:
- Intent Type: ${intentType}
- Location: ${location}
- Budget: ${budget}

Intent ID: ${intentId}

Next steps: Compliance check and decision generation will follow.
  `;

  return sendEmail({
    to: userEmail,
    template: EMAIL_TEMPLATES.INTENT_CREATED,
    subject,
    html,
    text,
    data: {
      intentId,
      intentType,
      location,
      budget: intent.payload?.budget,
    },
  });
}

/**
 * Phase 3: Email Trigger 2 - Compliance Check Result
 */
export async function sendComplianceResultEmail({ userEmail, compliance, intentId }) {
  const decision = compliance.decision || "UNKNOWN";
  const emoji = decision === "ALLOW" ? "✅" : decision === "DENY" ? "❌" : "⚠️";
  const subject = `${emoji} Compliance Check: ${decision}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${decision === "ALLOW" ? "#16a34a" : decision === "DENY" ? "#dc2626" : "#d97706"};">
        ${emoji} Compliance Check Result
      </h2>
      <p><strong>Decision:</strong> ${decision}</p>
      <p><strong>Reason:</strong> ${compliance.reason || "N/A"}</p>
      ${compliance.checks && compliance.checks.length > 0 ? `
        <h3 style="margin-top: 20px;">Checks Performed:</h3>
        <ul style="line-height: 1.8;">
          ${compliance.checks.map(check => `
            <li>
              <strong>${check.check}:</strong> ${check.passed ? "✅ PASS" : "❌ FAIL"}
              ${check.reason ? `<br><span style="color: #6b7280; font-size: 0.9em;">${check.reason}</span>` : ""}
            </li>
          `).join("")}
        </ul>
      ` : ""}
      <p style="margin-top: 20px; color: #6b7280;">
        Intent ID: <code>${intentId}</code>
      </p>
      <p style="margin-top: 20px;">
        ${decision === "ALLOW" 
          ? "Your intent is compliant. You can proceed with decisions." 
          : decision === "DENY"
          ? "Your intent is not compliant. Please review and adjust your requirements."
          : "Your intent requires review. Please wait for further instructions."}
      </p>
    </div>
  `;

  const text = `
${emoji} Compliance Check Result

Decision: ${decision}
Reason: ${compliance.reason || "N/A"}

${compliance.checks && compliance.checks.length > 0 ? `
Checks Performed:
${compliance.checks.map(check => `- ${check.check}: ${check.passed ? "PASS" : "FAIL"}${check.reason ? ` (${check.reason})` : ""}`).join("\n")}
` : ""}

Intent ID: ${intentId}

${decision === "ALLOW" 
  ? "Your intent is compliant. You can proceed with decisions." 
  : decision === "DENY"
  ? "Your intent is not compliant. Please review and adjust your requirements."
  : "Your intent requires review. Please wait for further instructions."}
  `;

  return sendEmail({
    to: userEmail,
    template: EMAIL_TEMPLATES.COMPLIANCE_RESULT,
    subject,
    html,
    text,
    data: {
      intentId,
      compliance,
    },
  });
}

/**
 * Phase 3: Email Trigger 3 - Decision Generated
 */
export async function sendDecisionGeneratedEmail({ userEmail, decisions, intentId }) {
  const decisionsCount = decisions.length;
  const pendingCount = decisions.filter(d => d.evolutionState !== "CONFIRMED").length;
  const subject = `🎯 ${decisionsCount} Decision${decisionsCount > 1 ? "s" : ""} Generated`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8b5cf6;">Decisions Generated</h2>
      <p><strong>${decisionsCount} decision${decisionsCount > 1 ? "s" : ""} generated.</strong></p>
      <p>${pendingCount > 0 ? `${pendingCount} pending your review.` : "All decisions confirmed."}</p>
      
      <h3 style="margin-top: 20px;">Decision Types:</h3>
      <ul style="line-height: 1.8;">
        ${decisions.map(decision => `
          <li>
            <strong>${decision.type?.replace(/_/g, " ") || "Decision"}:</strong>
            ${decision.evolutionState === "CONFIRMED" ? "✅ Confirmed" : "⏳ Pending"}
            ${decision.recommendation ? `<br><span style="color: #d97706; font-size: 0.9em;">⭐ Recommended: ${decision.recommendation}</span>` : ""}
          </li>
        `).join("")}
      </ul>
      
      <p style="margin-top: 20px; color: #6b7280;">
        Intent ID: <code>${intentId}</code>
      </p>
      <p style="margin-top: 20px;">
        Please review and confirm your decisions in the Intent Platform.
      </p>
    </div>
  `;

  const text = `
Decisions Generated

${decisionsCount} decision${decisionsCount > 1 ? "s" : ""} generated.
${pendingCount > 0 ? `${pendingCount} pending your review.` : "All decisions confirmed."}

Decision Types:
${decisions.map(decision => `- ${decision.type?.replace(/_/g, " ") || "Decision"}: ${decision.evolutionState === "CONFIRMED" ? "Confirmed" : "Pending"}`).join("\n")}

Intent ID: ${intentId}

Please review and confirm your decisions in the Intent Platform.
  `;

  return sendEmail({
    to: userEmail,
    template: EMAIL_TEMPLATES.DECISION_GENERATED,
    subject,
    html,
    text,
    data: {
      intentId,
      decisionsCount,
      pendingCount,
      decisions,
    },
  });
}

/**
 * Phase 3: Email Trigger 4 - Decision Confirmed (Individual)
 * Updated: Send to correct recipients based on decision type
 */
export async function sendDecisionConfirmedEmail({ userEmail, decision, intentId, decisions = [] }) {
  const { getDecisionEmailRecipients } = await import("./emailRecipients");
  const recipients = getDecisionEmailRecipients(decision.type, decision, userEmail);
  const decisionType = decision.type || "Decision";
  const selectedOption = decision.options?.find(opt => opt.id === decision.selectedOptionId) || 
                        decision.selectedOption || 
                        { label: decision.selectedOptionId || "N/A" };
  const optionLabel = selectedOption.label || selectedOption.name || decision.selectedOptionId;
  const confidence = decision.confidence ? `${(decision.confidence * 100).toFixed(0)}%` : "N/A";
  
  const subject = `✅ Decision Confirmed: ${decisionType}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Decision Confirmed</h2>
      <p><strong>Decision Type:</strong> ${decisionType.replace(/_/g, " ")}</p>
      <p><strong>Selected Option:</strong> ${optionLabel}</p>
      <p><strong>Confidence:</strong> ${confidence}</p>
      ${decision.decidedBy ? `<p><strong>Decided By:</strong> ${decision.decidedBy}</p>` : ""}
      ${decision.decisionMethod ? `<p><strong>Method:</strong> ${decision.decisionMethod}</p>` : ""}
      <p style="margin-top: 20px; color: #6b7280;">
        Intent ID: <code>${intentId}</code>
      </p>
      <p style="margin-top: 20px;">
        This decision has been confirmed. Next steps will be unlocked as dependencies are met.
      </p>
    </div>
  `;

  const text = `
Decision Confirmed

Decision Type: ${decisionType.replace(/_/g, " ")}
Selected Option: ${optionLabel}
Confidence: ${confidence}
${decision.decidedBy ? `Decided By: ${decision.decidedBy}` : ""}
${decision.decisionMethod ? `Method: ${decision.decisionMethod}` : ""}

Intent ID: ${intentId}

This decision has been confirmed. Next steps will be unlocked as dependencies are met.
  `;

  // Send email to all recipients (sendEmail now supports array)
  return sendEmail({
    to: recipients, // Pass array of recipients
    template: EMAIL_TEMPLATES.DECISION_CONFIRMED,
    subject,
    html,
    text,
    data: {
      intentId,
      decisionType,
      selectedOption: optionLabel,
      confidence,
      decision,
    },
  });
}

/**
 * Phase 3: Email Trigger 6 - Decision Changed
 */
export async function sendDecisionChangedEmail({ userEmail, decision, newOption, reason, intentId }) {
  const decisionType = decision.type || "Decision";
  const oldOption = decision.options?.find(opt => opt.id === decision.previousOptionId) || 
                   decision.previousOption || 
                   { label: "Previous selection" };
  const newOptionLabel = newOption?.label || newOption?.name || decision.selectedOptionId;
  const oldOptionLabel = oldOption.label || oldOption.name || "Previous selection";
  
  const subject = `🔄 Decision Changed: ${decisionType}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d97706;">Decision Changed</h2>
      <p><strong>Decision Type:</strong> ${decisionType.replace(/_/g, " ")}</p>
      <p><strong>Previous Selection:</strong> ${oldOptionLabel}</p>
      <p><strong>New Selection:</strong> ${newOptionLabel}</p>
      ${reason ? `<p><strong>Reason for Change:</strong> ${reason}</p>` : ""}
      ${decision.decidedBy ? `<p><strong>Changed By:</strong> ${decision.decidedBy}</p>` : ""}
      <p style="margin-top: 20px; color: #6b7280;">
        Intent ID: <code>${intentId}</code>
      </p>
      <p style="margin-top: 20px;">
        This decision change has been logged in the audit trail.
      </p>
    </div>
  `;

  const text = `
Decision Changed

Decision Type: ${decisionType.replace(/_/g, " ")}
Previous Selection: ${oldOptionLabel}
New Selection: ${newOptionLabel}
${reason ? `Reason for Change: ${reason}` : ""}
${decision.decidedBy ? `Changed By: ${decision.decidedBy}` : ""}

Intent ID: ${intentId}

This decision change has been logged in the audit trail.
  `;

  return sendEmail({
    to: userEmail,
    template: EMAIL_TEMPLATES.DECISION_CHANGED,
    subject,
    html,
    text,
    data: {
      intentId,
      decisionType,
      oldOption: oldOptionLabel,
      newOption: newOptionLabel,
      reason,
      decision,
    },
  });
}

/**
 * Phase 3: Email Trigger 7 - Action Created
 */
export async function sendActionCreatedEmail({ userEmail, actions, intentId }) {
  const actionsCount = actions.length;
  const firstAction = actions[0];
  const subject = `📋 ${actionsCount} Action${actionsCount > 1 ? "s" : ""} Created`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Actions Created</h2>
      <p><strong>${actionsCount} action${actionsCount > 1 ? "s" : ""} created.</strong></p>
      ${firstAction ? `<p><strong>First Action:</strong> ${firstAction.description || firstAction.name || "Action"}</p>` : ""}
      
      <h3 style="margin-top: 20px;">Action List:</h3>
      <ol style="line-height: 1.8;">
        ${actions.slice(0, 5).map((action, idx) => `
          <li>
            <strong>${action.description || action.name || `Action ${idx + 1}`}</strong>
            ${action.guidance ? `<br><span style="color: #6b7280; font-size: 0.9em;">💡 ${action.guidance}</span>` : ""}
          </li>
        `).join("")}
        ${actions.length > 5 ? `<li style="color: #6b7280;">... and ${actions.length - 5} more</li>` : ""}
      </ol>
      
      <p style="margin-top: 20px; color: #6b7280;">
        Intent ID: <code>${intentId}</code>
      </p>
      <p style="margin-top: 20px;">
        Actions execute in sequential order. Complete each action to unlock the next one.
      </p>
    </div>
  `;

  const text = `
Actions Created

${actionsCount} action${actionsCount > 1 ? "s" : ""} created.
${firstAction ? `First Action: ${firstAction.description || firstAction.name || "Action"}` : ""}

Action List:
${actions.slice(0, 5).map((action, idx) => `${idx + 1}. ${action.description || action.name || `Action ${idx + 1}`}${action.guidance ? ` - ${action.guidance}` : ""}`).join("\n")}
${actions.length > 5 ? `... and ${actions.length - 5} more` : ""}

Intent ID: ${intentId}

Actions execute in sequential order. Complete each action to unlock the next one.
  `;

  return sendEmail({
    to: userEmail,
    template: EMAIL_TEMPLATES.ACTION_CREATED,
    subject,
    html,
    text,
    data: {
      intentId,
      actionsCount,
      actions,
    },
  });
}

/**
 * Phase 3: Email Trigger 9 - Intent Completed
 */
export async function sendIntentCompletedEmail({ userEmail, intent, decisions, actions, intentId }) {
  const subject = "🎉 Intent Completed - Final Report";
  
  const completedActions = actions.filter(a => a.outcome === "COMPLETED" || a.outcome === "CONFIRMED");
  const confirmedDecisions = decisions.filter(d => d.evolutionState === "CONFIRMED");
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">🎉 Intent Completed</h2>
      <p>Congratulations! Your intent has been successfully completed.</p>
      
      <h3 style="margin-top: 20px;">Summary:</h3>
      <ul style="line-height: 1.8;">
        <li><strong>Intent Type:</strong> ${intent.type || "N/A"}</li>
        <li><strong>Location:</strong> ${intent.payload?.location || "N/A"}</li>
        <li><strong>Decisions Confirmed:</strong> ${confirmedDecisions.length}</li>
        <li><strong>Actions Completed:</strong> ${completedActions.length}</li>
      </ul>
      
      <p style="margin-top: 20px; color: #6b7280;">
        Intent ID: <code>${intentId}</code>
      </p>
      <p style="margin-top: 20px;">
        A detailed report (DOCX) is attached to this email with complete intent information.
      </p>
    </div>
  `;

  const text = `
🎉 Intent Completed

Congratulations! Your intent has been successfully completed.

Summary:
- Intent Type: ${intent.type || "N/A"}
- Location: ${intent.payload?.location || "N/A"}
- Decisions Confirmed: ${confirmedDecisions.length}
- Actions Completed: ${completedActions.length}

Intent ID: ${intentId}

A detailed report (DOCX) is attached to this email with complete intent information.
  `;

  // Prepare intent data for DOCX generation
  const intentData = {
    intentId,
    intentType: intent.type,
    location: intent.payload?.location || intent.extractedInfo?.location,
    budget: intent.payload?.budget,
    decisions: decisions.map(d => ({
      type: d.type,
      selectedOptionId: d.selectedOptionId,
      options: d.options,
      selectedOption: d.selectedOption,
      evolutionState: d.evolutionState,
      confidence: d.confidence,
    })),
    actions: actions.map(a => ({
      actionId: a.actionId,
      description: a.description || a.name,
      status: a.status,
      outcome: a.outcome,
    })),
    compliance: intent.compliance,
    createdAt: intent.createdAt,
    completedAt: new Date().toISOString(),
  };

  return sendEmail({
    to: userEmail,
    template: EMAIL_TEMPLATES.INTENT_COMPLETED,
    subject,
    html,
    text,
    data: intentData,
    generateDocx: true, // Phase 3: Generate and attach DOCX report
  });
}
