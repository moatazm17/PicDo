const OpenAI = require('openai');
const { ensureSummaryInUiLang } = require('./summaryLang');

class AIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async classifyText(ocrText, uiLang = 'en') {
    const systemPrompt = this.getSystemPrompt(uiLang);
    
    try {
      console.log('OpenAI API: Starting text classification');
      console.log('OpenAI API: Input text length:', ocrText.length);
      console.log('OpenAI API: Input text sample:', ocrText.substring(0, 100) + (ocrText.length > 100 ? '...' : ''));
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the OCR text from a screenshot. Please classify it according to the instructions:\n\n${ocrText}` }
        ],
        temperature: 0.05, // Reduced temperature for more deterministic outputs
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      console.log('OpenAI API: Response received, length:', content.length);
      console.log('OpenAI API: Response sample:', content.substring(0, 200) + (content.length > 200 ? '...' : ''));
      
      let classification = JSON.parse(content);
      
      // Validate the response structure
      this.validateClassification(classification);
      
      // Post-process to ensure summary is short
      classification = this.enforceSummaryLength(classification, uiLang);
      
      return classification;
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      // Log more details about the error
      if (error.response) {
        console.error('OpenAI API error status:', error.response.status);
        console.error('OpenAI API error data:', error.response.data);
      }
      
      // Return a fallback classification
      return {
        type: 'expense',
        title: 'Unclassified Item',
        summary: 'Could not classify this item',
        event: {},
        expense: {
          amount: 0,
          currency: 'USD',
          merchant: 'Unknown',
          date: new Date().toISOString().split('T')[0]
        },
        contact: {},
        address: {},
        confidence: 0.1
      };
    }
  }

  getSystemPrompt(uiLang) {
    const lang = uiLang === 'ar' ? 'Arabic' : 'English';
    
    return `
You are an intelligent OCR-content processor. Your task is to clean noisy OCR text, classify it, generate a concise summary, and extract all relevant fields. **Return JSON only. No prose.**

########################## NOISE FILTERING ##########################
1. **Ignore all UI and decoration:** Remove browser tabs, social media buttons, ads, navigation menus, "Like | Comment | Share", timestamps ("3 س"), and header/footer elements. Focus on the main content users care about.
2. **Strip out repeated headers, footers, and unrelated interface text** before classification.

######################### TYPE DETECTION #########################
Classify the cleaned content using these **priority-based, context-aware rules** (check in order):

1. **CONTACT (highest priority)**
   - Indicators: phone numbers, emails, phrases like "call us", contact hours, Dr./Mr./Ms.
   - Context: personal or business contact details (e.g. doctors, service hotlines).
   - Extract: \`name\` (company/person), \`phone\`, \`email\`, \`location\` (if present).

2. **EXPENSE**
   - Indicators: currency symbols (e.g., $, €, £, ج.م), "Total" lines, itemized lists, transaction confirmations, bank names.
   - Context: receipts, bills, transfers, payments.
   - Extract: \`merchant\` (store or bank), \`amount\` (total or transaction amount), \`name\` (recipient or payer), \`date\` and \`time\`.

3. **EVENT**
   - Indicators: **future** dates with invitation language ("Join us", "ستقام", "will be held"), venue/location details, official event names.
   - Context: actual invitations to upcoming events or appointments. **Do not classify past experiences or news about events** as events.
   - Extract: \`date\`, \`time\`, \`location\`, \`title\`, and any URLs.
   - If the content recounts a **past** event or story ("ذهبت إلى…", "I attended…"), classify as \`note\` instead.

4. **ADDRESS**
   - Indicators: street numbers, city names, postal codes, map-like structures.
   - Context: sharing addresses or directions.
   - Extract: \`location\`, plus any names or landmark details.

5. **DOCUMENT**
   - Indicators: formal tone, headlines, publication names, official language, news or procedural content.
   - Context: news articles, official announcements, instructions, recipes, formal documents.
   - Extract: \`title\`, \`date\` (if present), and assign a specific \`category\` (e.g., "news", "recipe", "manual").

6. **NOTE (fallback)**
   - Includes: personal stories, social media posts, lists, informal content.
   - Context: informal narratives ("I went…", "We had a great time"), social posts. **All social media content** (detected via usernames, "posted", personal tone) should be classified as a note, even if it mentions events.
   - Extract the full \`content\`, with \`category\` such as "social media", "personal note", or other relevant description.

**Social Media Detection (overrides Event):**  
If the content contains usernames, timestamps, emoji, or personal narrative tone, it is a social media post → \`type: "note"\`, \`category: "social media"\`.

######################### SUMMARY GENERATION #########################
- **Language:** use ${lang} summaries.
- **Length:** 2–4 words, max 40 characters.
- **Specificity:** include names, amounts, locations, or key nouns (e.g., "محمد رمضان نيويورك", "تحويل محمد 560").
- **Avoid general phrases:** Do not use generic summaries like "معاملة البنك" or "تأكيد معاملة".

Example outputs for guidance (${lang} UI):
${uiLang === 'ar' ? 
  '• Social post → summary: "محمد رمضان نيويورك", category: "social media"\n• Bank transfer → summary: "تحويل محمد 560", merchant: "البنك العربي"\n• Contact info → summary: "خدمة WE", name: "WE", phone: "111"' :
  '• Social post → summary: "Mohamed NYC Trip", category: "social media"\n• Bank transfer → summary: "Transfer Mohamed 560", merchant: "Arab Bank"\n• Contact info → summary: "WE Service", name: "WE", phone: "111"'
}

######################### FIELD EXTRACTION #########################
Return the cleaned main content in \`fields.content\` and fill these fields (null if not present):

- \`title\`: original headline or document title.
- \`content\`: full cleaned text (original language).
- \`category\`: content category (e.g. "social media", "news", "bank transfer", "contact info").
- \`date\`: primary date (in natural language or ISO).
- \`amount\`: transaction or receipt total.
- \`location\`: place names or address.
- \`name\`: names of people or companies (e.g., payee, bank, service provider).
- \`phone\`: phone number(s) (include only the main one).
- \`email\`: email address(es).
- \`merchant\`: store or bank name for expenses (null for other types).

######################### RESPONSE FORMAT #########################
Return exactly this JSON structure (nulls allowed for missing optional fields):
{
  "type": "contact|expense|event|address|note|document",
  "summary": "2–4 words in ${lang}",
  "fields": {
    "title": "original title or headline",
    "content": "cleaned main text",
    "category": "specific category",
    "date": "date if present or null",
    "amount": "amount if present or null",
    "location": "location if present or null",
    "name": "person or company name if present or null",
    "phone": "primary phone if present or null",
    "email": "email if present or null",
    "merchant": "merchant/bank if present or null"
  },
  "confidence": 0.9
}

Do not output anything else—**JSON only**.
`;
  }

  enforceSummaryLength(classification, uiLang) {
    if (!classification.summary) return classification;
    
    const words = classification.summary.trim().split(/\s+/);
    
    // If summary is too long, truncate intelligently
    if (words.length > 4 || classification.summary.length > 40) {
      console.log(`Summary too long (${words.length} words, ${classification.summary.length} chars), truncating:`, classification.summary);
      
      // Take first 2-3 most important words
      let shortSummary;
      if (words.length >= 3) {
        shortSummary = words.slice(0, 3).join(' ');
      } else {
        shortSummary = words.slice(0, 2).join(' ');
      }
      
      // Ensure it's still under 40 chars
      if (shortSummary.length > 40) {
        shortSummary = shortSummary.substring(0, 37) + '...';
      }
      
      classification.summary = shortSummary;
      console.log(`Truncated to:`, classification.summary);
    }
    
    return classification;
  }

  validateClassification(classification) {
    const VALID_TYPES = ['contact', 'expense', 'event', 'address', 'note', 'document'];
    const REQUIRED_TOP_FIELDS = ['type', 'summary', 'fields', 'confidence'];
    
    // Ensure all required top-level fields exist
    for (const field of REQUIRED_TOP_FIELDS) {
      if (!classification.hasOwnProperty(field)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate type
    if (!VALID_TYPES.includes(classification.type)) {
      throw new Error(`Invalid type: ${classification.type}`);
    }
    
    // Validate summary: 2–4 words, <= 40 chars
    const words = classification.summary.trim().split(/\s+/);
    if (words.length < 2 || words.length > 4 || classification.summary.length > 40) {
      console.log(`Summary validation failed: ${words.length} words, ${classification.summary.length} chars`);
      // Don't throw error, just log and continue (summary enforcement will fix it)
    }
    
    // Ensure fields object exists
    if (typeof classification.fields !== 'object' || classification.fields === null) {
      throw new Error('Missing or invalid fields object');
    }
    
    // Content must exist and be non-empty
    if (typeof classification.fields.content !== 'string' || classification.fields.content.trim() === '') {
      throw new Error('fields.content must be a non-empty string');
    }
    
    // Title can be null for some content types (like social posts), but if present must be string
    if (classification.fields.title !== null && (typeof classification.fields.title !== 'string' || classification.fields.title.trim() === '')) {
      throw new Error('fields.title must be a non-empty string or null');
    }
    
    // Category must be present
    if (typeof classification.fields.category !== 'string' || classification.fields.category.trim() === '') {
      throw new Error('fields.category must be a non-empty string');
    }
    
    // Confidence must be a number between 0 and 1
    if (typeof classification.confidence !== 'number' || classification.confidence < 0 || classification.confidence > 1) {
      throw new Error('confidence must be a number between 0 and 1');
    }
    
    // For contacts, phone or email is required
    if (classification.type === 'contact') {
      if (!(classification.fields.phone || classification.fields.email)) {
        throw new Error('Contact type must include at least a phone or email');
      }
    }
    
    // For expenses, merchant and amount should be present
    if (classification.type === 'expense') {
      if (!classification.fields.merchant || !classification.fields.amount) {
        console.log('Expense missing merchant or amount, but allowing...');
        // Don't throw error, just log
      }
    }
    
    // Ensure all type sections exist
    const typeSections = ['event', 'expense', 'contact', 'address', 'note', 'document'];
    for (const section of typeSections) {
      if (!(section in classification)) {
        classification[section] = {};
      }
    }
  }

  generateSummary(classification) {
    const { type, title } = classification;
    
    switch (type) {
      case 'event':
        const { date, time } = classification.event;
        return `${title}${date ? ` – ${date}` : ''}${time ? ` ${time}` : ''}`;
      
      case 'expense':
        const { amount, currency, merchant } = classification.expense;
        return `${merchant || title}${amount ? ` – ${amount} ${currency || ''}` : ''}`;
      
      case 'contact':
        const { name, phone } = classification.contact;
        return `${name || title}${phone ? ` – ${phone}` : ''}`;
      
      case 'address':
        return `${title} – ${classification.address.full || 'Address'}`;
      
      case 'note':
        const { category } = classification.note;
        return `${title}${category ? ` – ${category}` : ''}`;
      
      case 'document':
        const { category: docCategory } = classification.document;
        return `${title}${docCategory ? ` – ${docCategory}` : ''}`;
      
      default:
        return title;
    }
  }
}

module.exports = AIService;
