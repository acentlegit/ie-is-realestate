# Email Service - Phase 3

Email service with SendGrid integration and DOCX document generation.

## Quick Start

**For detailed step-by-step instructions, see:** `EMAIL_SERVICE_SETUP_GUIDE.md` in the parent directory.

### Quick Setup (5 steps):

1. **Navigate to email-service folder:**
   ```bash
   cd email-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file and add your SendGrid credentials:**
   ```env
   SENDGRID_API_KEY=SG_your_real_key_here
   FROM_EMAIL=your_verified_sender@yourdomain.com
   EMAIL_SERVICE_PORT=7008
   ```

4. **Start the service:**
   ```bash
   npm start
   ```

5. **Verify it's running:**
   ```bash
   curl http://localhost:7008/health
   ```

**That's it!** The email service is now running and ready to send emails.

## API Endpoints

### POST /v1/send
Send email via SendGrid.

**Request Body:**
```json
{
  "to": "user@example.com",
  "template": "INITIAL_CONFIRMATION",
  "subject": "Email Subject",
  "html": "<h1>HTML Content</h1>",
  "text": "Plain text content",
  "data": { ... },
  "generateDocx": true
}
```

### POST /v1/generate-docx
Generate DOCX document for intent report.

**Request Body:**
```json
{
  "intentData": {
    "intentId": "intent-123",
    "intentType": "BUY_PROPERTY",
    "location": "Bangalore",
    "budget": 5000000,
    "decisions": [...],
    "actions": [...],
    "compliance": {...}
  }
}
```

### GET /health
Health check endpoint.

## Features

- ✅ SendGrid email integration
- ✅ DOCX document generation
- ✅ Email attachments support
- ✅ 9 email trigger points support
- ✅ Non-blocking email sending
