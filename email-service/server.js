/**
 * Email Service - SendGrid + DOCX Generation
 * 
 * Phase 3: Email Automation
 * - 9 email trigger points
 * - SendGrid integration
 * - DOCX document generation for intent reports
 */

require("dotenv").config();
const express = require("express");
const sgMail = require("@sendgrid/mail");
const cors = require("cors");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = require("docx");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.EMAIL_SERVICE_PORT || 7008;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

if (!SENDGRID_API_KEY) {
  console.error("❌ Missing SENDGRID_API_KEY in .env");
  process.exit(1);
}

if (!FROM_EMAIL) {
  console.error("❌ Missing FROM_EMAIL in .env");
  process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

// Ensure temp directory exists for DOCX files
const TEMP_DIR = path.join(__dirname, "temp");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Generate DOCX document for intent report
 */
async function generateIntentReportDOCX(intentData) {
  const {
    intentId,
    intentType,
    location,
    budget,
    decisions = [],
    actions = [],
    compliance,
    createdAt,
    completedAt
  } = intentData;

  const children = [
    new Paragraph({
      text: "Intent Platform - Intent Report",
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      text: `Intent ID: ${intentId || "N/A"}`,
    }),
    new Paragraph({
      text: `Intent Type: ${intentType || "N/A"}`,
    }),
    new Paragraph({
      text: `Location: ${location || "N/A"}`,
    }),
    new Paragraph({
      text: `Budget: ${budget ? `₹${(budget / 100000).toFixed(0)}L` : "N/A"}`,
    }),
    new Paragraph({
      text: `Created: ${createdAt ? new Date(createdAt).toLocaleString() : "N/A"}`,
    }),
    new Paragraph({
      text: `Completed: ${completedAt ? new Date(completedAt).toLocaleString() : "In Progress"}`,
    }),
    new Paragraph({ text: "" }),
  ];

  // Compliance Section
  if (compliance) {
    children.push(
      new Paragraph({
        text: "Compliance Status",
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: `Decision: ${compliance.decision || "N/A"}`,
      }),
      new Paragraph({
        text: `Reason: ${compliance.reason || "N/A"}`,
      }),
      new Paragraph({ text: "" })
    );
  }

  // Decisions Section
  if (decisions && decisions.length > 0) {
    children.push(
      new Paragraph({
        text: "Decisions",
        heading: HeadingLevel.HEADING_1,
      })
    );

    const decisionTableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Type")] }),
          new TableCell({ children: [new Paragraph("Selected Option")] }),
          new TableCell({ children: [new Paragraph("Status")] }),
          new TableCell({ children: [new Paragraph("Confidence")] }),
        ],
      }),
    ];

    decisions.forEach((decision) => {
      const selectedOption = decision.options?.find(
        (opt) => opt.id === decision.selectedOptionId
      ) || decision.selectedOption;
      const optionLabel = selectedOption?.label || selectedOption?.name || decision.selectedOptionId || "N/A";
      const confidence = decision.confidence ? `${(decision.confidence * 100).toFixed(0)}%` : "N/A";

      decisionTableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(decision.type || "N/A")] }),
            new TableCell({ children: [new Paragraph(optionLabel)] }),
            new TableCell({ children: [new Paragraph(decision.evolutionState || "N/A")] }),
            new TableCell({ children: [new Paragraph(confidence)] }),
          ],
        })
      );
    });

    children.push(
      new Table({
        rows: decisionTableRows,
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
      }),
      new Paragraph({ text: "" })
    );
  }

  // Actions Section
  if (actions && actions.length > 0) {
    children.push(
      new Paragraph({
        text: "Actions",
        heading: HeadingLevel.HEADING_1,
      })
    );

    const actionTableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Description")] }),
          new TableCell({ children: [new Paragraph("Status")] }),
          new TableCell({ children: [new Paragraph("Outcome")] }),
        ],
      }),
    ];

    actions.forEach((action) => {
      actionTableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(action.description || action.name || "N/A")] }),
            new TableCell({ children: [new Paragraph(action.status || "N/A")] }),
            new TableCell({ children: [new Paragraph(action.outcome || "PENDING")] }),
          ],
        })
      );
    });

    children.push(
      new Table({
        rows: actionTableRows,
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * Validate email address format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // Basic email regex - must contain @ and valid domain
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length > 5 && email.length < 255;
}

/**
 * Email sending endpoint
 */
app.post("/v1/send", async (req, res) => {
  try {
    const { to, template, data, subject, html, text, generateDocx } = req.body;

    if (!to) {
      return res.status(400).json({ error: "Missing 'to' email address" });
    }

    // Validate email addresses (handle both string and array)
    const recipients = Array.isArray(to) ? to : [to];
    const invalidEmails = recipients.filter(email => !isValidEmail(email));
    
    if (invalidEmails.length > 0) {
      console.warn(`⚠️ Skipping email send - invalid email addresses: ${invalidEmails.join(", ")}`);
      // Return success but log warning (non-blocking for mock auth)
      return res.json({
        success: false,
        skipped: true,
        reason: "Invalid email address",
        invalidEmails,
        message: `Email skipped: invalid recipient(s) - ${invalidEmails.join(", ")}`
      });
    }

    const msg = {
      to,
      from: FROM_EMAIL,
      subject: subject || "Intent Platform Notification",
      text: text || "",
      html: html || text || "",
    };

    // Generate and attach DOCX if requested
    if (generateDocx && data) {
      try {
        const docxBuffer = await generateIntentReportDOCX(data);
        const filename = `intent-report-${data.intentId || Date.now()}.docx`;
        const filepath = path.join(TEMP_DIR, filename);
        
        fs.writeFileSync(filepath, docxBuffer);
        
        msg.attachments = [
          {
            content: docxBuffer.toString("base64"),
            filename: filename,
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            disposition: "attachment",
          },
        ];

        // Clean up temp file after sending
        setTimeout(() => {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        }, 60000); // Delete after 1 minute
      } catch (docxErr) {
        console.warn("[Email Service] DOCX generation failed (non-blocking):", docxErr);
        // Continue without DOCX attachment
      }
    }

    const response = await sgMail.send(msg);
    
    console.log(`✅ Email sent: ${template} to ${to} (Status: ${response[0].statusCode})`);
    
    res.json({
      success: true,
      statusCode: response[0].statusCode,
      messageId: response[0].headers["x-message-id"],
      template,
    });
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    
    if (error.response?.body) {
      console.error("SendGrid error details:", JSON.stringify(error.response.body, null, 2));
      return res.status(500).json({
        error: "Failed to send email",
        details: error.response.body,
      });
    }
    
    res.status(500).json({
      error: "Failed to send email",
      message: error.message,
    });
  }
});

/**
 * Generate DOCX endpoint (standalone)
 */
app.post("/v1/generate-docx", async (req, res) => {
  try {
    const { intentData } = req.body;

    if (!intentData) {
      return res.status(400).json({ error: "Missing intentData" });
    }

    const docxBuffer = await generateIntentReportDOCX(intentData);
    const filename = `intent-report-${intentData.intentId || Date.now()}.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(docxBuffer);
  } catch (error) {
    console.error("❌ Failed to generate DOCX:", error);
    res.status(500).json({
      error: "Failed to generate DOCX",
      message: error.message,
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "email-service",
    sendgrid: SENDGRID_API_KEY ? "configured" : "not configured",
    fromEmail: FROM_EMAIL || "not configured"
  });
});

app.listen(PORT, () => {
  console.log(`📧 Email Service running on port ${PORT}`);
  console.log(`📧 SendGrid configured with FROM: ${FROM_EMAIL}`);
  console.log(`📧 DOCX generation: enabled`);
});
