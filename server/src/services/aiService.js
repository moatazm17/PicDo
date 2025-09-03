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
    return `You are a smart document classifier that extracts actionable data from OCR text. Return **JSON only**.

STEP 1: NOISE FILTERING
First, identify and IGNORE these UI elements:
- Browser UI: "Chrome", "Safari", "tabs", navigation bars, "Home | Profile | Settings"
- Social media UI: "Like | Comment | Share", "Sponsored Ad", usernames, timestamps
- Website navigation: menus, headers, footers, "Login", "Sign up"
- Advertisements: "Ad", "Sponsored", promotional content
- Generic UI: buttons, form labels, "Submit", "Cancel"

FOCUS ONLY on the main document content - the actual information a human would care about.

STEP 2: SMART TYPE DETECTION
Classify using these priority rules:

CONTACT (highest priority if present):
- Contains: Dr./Mr./Ms. + name, phone numbers, email addresses, company names
- Keywords: "Phone:", "Email:", "Contact", "Office Hours", "Customer Service"
- Name extraction: Person names (Dr. Sarah), company names (WE, Starbucks), service names (Customer Service)

EXPENSE (high priority):
- Contains: currency symbols ($, £, €, ج.م), "Total:", "Amount:", receipts
- Keywords: "Receipt", "Invoice", "Bill", "Payment", "Tax"

EVENT (medium priority):
- Contains: specific dates + times, "Meeting", "Appointment", "Event"
- Keywords: "at", location names, "will take place", calendar-like format

ADDRESS (medium priority):
- Contains: street numbers, city names, postal codes
- Keywords: "Street", "Avenue", "City", map-like format

DOCUMENT (for formal content):
- Contains: official language, procedures, instructions, news articles
- Keywords: formal tone, publication names, article structure

NOTE (fallback):
- Everything else: social posts, personal notes, lists, informal content

STEP 3: SUMMARY GENERATION
Create a ${uiLang === 'ar' ? 'Arabic' : 'English'} summary that is:
- EXACTLY 2-4 words maximum
- Like naming a file or folder
- Focus on the main subject/entity

${uiLang === 'ar' ? 'Arabic' : 'English'} Summary Examples:
${uiLang === 'ar' ? 
  '- News: "خبر القطار", content: "full article"\n- Contact: "خدمة WE", name: "WE", phone: "111", content: "Contact WE on 111 or 222022 or 01555000111"\n- Receipt: "فاتورة ستاربكس", merchant: "Starbucks", amount: "5.45"\n- Address: "عنوان المكان", full: "street address", content: "complete address"' :
  '- News: "Train News", content: "full article"\n- Contact: "WE Service", name: "WE", phone: "111", content: "Contact WE on 111 or 222022 or 01555000111"\n- Receipt: "Starbucks Bill", merchant: "Starbucks", amount: "5.45"\n- Address: "Hospital Address", full: "street address", content: "complete address"'
}

STEP 4: FIELD EXTRACTION
Extract fields based on type:

FOR ALL TYPES:
- title: Original headline/title from document (preserve exact language)
- content: Main text content (cleaned, no UI noise)
- category: Specific category (e.g., "news", "medical", "coffee shop", "social media")

TYPE-SPECIFIC FIELDS:
- contact: name (person name OR company name OR service name), phone (FIRST/MAIN number only), email
- expense: amount (final total only), currency, merchant (business name), date  
- event: date (ISO format), time (24h), location, url
- address: full (complete address in content), location (main location name)

STEP 5: DATA ACCURACY
- NEVER modify numbers, dates, or specific details from OCR
- If OCR shows "015", keep "015" (don't change to "+20115")
- Preserve exact formatting and spelling from original
- Extract multiple phone/email if present
- For amounts, use the final "Total" not individual items

Return this exact JSON structure:
{
  "type": "contact|expense|event|address|note|document",
  "summary": "2-4 words in ${uiLang === 'ar' ? 'Arabic' : 'English'}",
  "fields": {
    "title": "original document title/headline",
    "content": "cleaned main content (no UI noise)",
    "category": "specific category",
    "date": "YYYY-MM-DD or null",
    "time": "HH:mm or null", 
    "amount": "numeric value or null",
    "currency": "USD|EUR|EGP|SAR|AED or null",
    "location": "location or null",
    "name": "full name or null",
    "phone": "phone number or null",
    "email": "email or null"
  },
  "confidence": 0.9
}

NO explanations. JSON only.`;
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
    const requiredFields = ['type', 'summary', 'confidence'];
    const validTypes = ['event', 'expense', 'contact', 'address', 'note', 'document'];
    
    for (const field of requiredFields) {
      if (!(field in classification)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Check for title - accept either top-level title OR fields.title
    if (!classification.title && !classification.fields?.title) {
      throw new Error(`Missing required field: title (either top-level or in fields)`);
    }
    
    if (!validTypes.includes(classification.type)) {
      throw new Error(`Invalid type: ${classification.type}`);
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
