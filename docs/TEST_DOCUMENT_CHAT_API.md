# 🧪 Document Chat API Testing Guide

## Quick Test (Browser)

### 1. Start Development Server
```bash
cd village-app
npm run dev
```

### 2. Open Test Endpoint
Im Browser öffnen (nach Login):
```
http://localhost:3000/api/test/document-chat
```

Dieser Endpoint testet automatisch:
- ✅ Ob Dokumente vorhanden sind
- ✅ Ob Text extrahiert werden kann
- ✅ Ob Chat-Tabellen existieren
- ✅ Ob Gemini API Key konfiguriert ist
- ✅ Ob Chat-Historie abgerufen werden kann

---

## Manual API Testing

### Prerequisites
1. **User muss eingeloggt sein** (Session Cookie wird benötigt)
2. **Mindestens ein Dokument** muss im Vault hochgeladen sein
3. **Gemini API Key** muss in `.env.local` gesetzt sein

### Step 1: Get Document ID

**Request:**
```bash
curl http://localhost:3000/api/vault/list \
  -H "Cookie: sb-jfldmfpbewiuahdhvjvc-auth-token=YOUR_SESSION_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "documents": [
    {
      "id": "abc-123-def-456",
      "file_name": "rental_contract.pdf",
      "mime_type": "application/pdf",
      ...
    }
  ]
}
```

**Notiz:** Kopiere die `id` des ersten Dokuments.

---

### Step 2: Extract Text from Document

**Request:**
```bash
curl -X POST http://localhost:3000/api/documents/DOCUMENT_ID/extract-text \
  -H "Cookie: sb-jfldmfpbewiuahdhvjvc-auth-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

**Response (Success):**
```json
{
  "success": true,
  "extracted_text": "Full text content of the PDF...",
  "cached": false,
  "text_length": 12345
}
```

**Response (Already Cached):**
```json
{
  "success": true,
  "extracted_text": "...",
  "cached": true,
  "text_length": 12345
}
```

**Response (Scanned PDF):**
```json
{
  "error": "This document appears to be scanned. Text extraction is not available for scanned documents.",
  "is_scanned": true
}
```

---

### Step 3: Get Chat History

**Request:**
```bash
curl http://localhost:3000/api/documents/DOCUMENT_ID/chat \
  -H "Cookie: sb-jfldmfpbewiuahdhvjvc-auth-token=YOUR_SESSION_TOKEN"
```

**Response (Empty Chat):**
```json
{
  "success": true,
  "messages": [],
  "chat_id": null
}
```

**Response (With Messages):**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg-1",
      "chat_id": "chat-1",
      "role": "user",
      "content": "What is this document about?",
      "created_at": "2025-11-07T10:00:00Z"
    },
    {
      "id": "msg-2",
      "chat_id": "chat-1",
      "role": "assistant",
      "content": "This document is a rental contract...",
      "source_page": 1,
      "source_section": "Section 1",
      "tokens_used": 150,
      "created_at": "2025-11-07T10:00:01Z"
    }
  ],
  "chat_id": "chat-1",
  "language": "en"
}
```

---

### Step 4: Send Question to Document

**Request:**
```bash
curl -X POST http://localhost:3000/api/documents/DOCUMENT_ID/chat \
  -H "Cookie: sb-jfldmfpbewiuahdhvjvc-auth-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the cancellation period?",
    "language": "en"
  }'
```

**Response:**
```json
{
  "success": true,
  "response": "According to Section 7.2 on page 3, the cancellation period is 3 months before the end of the contract year.",
  "source_page": 3,
  "source_section": "Section 7.2",
  "tokens_used": 250,
  "response_time_ms": 1200
}
```

---

### Step 5: Send Follow-up Question

**Request:**
```bash
curl -X POST http://localhost:3000/api/documents/DOCUMENT_ID/chat \
  -H "Cookie: sb-jfldmfpbewiuahdhvjvc-auth-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "When does the contract year end?",
    "language": "en"
  }'
```

**Response:**
```json
{
  "success": true,
  "response": "Your contract started on January 1st, so the contract year ends on December 31st each year.",
  "source_page": 1,
  "source_section": "Section 1.1",
  "tokens_used": 180,
  "response_time_ms": 950
}
```

---

## Error Responses

### Unauthorized (401)
```json
{
  "error": "Unauthorized"
}
```
**Fix:** User muss eingeloggt sein.

---

### Document Not Found (404)
```json
{
  "error": "Document not found"
}
```
**Fix:** Document ID ist falsch oder Dokument gehört nicht dem User.

---

### Text Not Available (400)
```json
{
  "error": "Document text not available. Please extract text first.",
  "needs_extraction": true
}
```
**Fix:** Rufe zuerst `/api/documents/[id]/extract-text` auf.

---

### Scanned Document (400)
```json
{
  "error": "This document appears to be scanned. Chat is not available for scanned documents.",
  "is_scanned": true
}
```
**Fix:** Dokument ist gescannt (kein extrahierbarer Text). V2: OCR implementieren.

---

### AI Service Not Configured (500)
```json
{
  "error": "AI service is not configured"
}
```
**Fix:** `GEMINI_API_KEY` muss in `.env.local` gesetzt sein.

---

## Testing with Browser DevTools

### 1. Open Browser DevTools (F12)
### 2. Go to Network Tab
### 3. Navigate to a page with documents (e.g., `/vault`)
### 4. Open Console Tab
### 5. Run JavaScript:

```javascript
// Get first document
const response = await fetch('/api/vault/list')
const data = await response.json()
const docId = data.documents[0].id
console.log('Document ID:', docId)

// Extract text
const extractRes = await fetch(`/api/documents/${docId}/extract-text`, {
  method: 'POST'
})
const extractData = await extractRes.json()
console.log('Extract result:', extractData)

// Send question
const chatRes = await fetch(`/api/documents/${docId}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What is this document about?',
    language: 'en'
  })
})
const chatData = await chatRes.json()
console.log('Chat response:', chatData)
```

---

## Expected Test Results

✅ **All tests should pass if:**
- User is logged in
- At least one PDF document exists in vault
- Document has extractable text (not scanned)
- Gemini API key is configured
- Database migrations are applied

❌ **Tests will fail if:**
- No documents uploaded
- Document is scanned (no text)
- Gemini API key missing
- Chat tables not created (migration not applied)




















