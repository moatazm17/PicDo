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
    
    // Regular expressions for entity extraction
    this.PATTERNS = {
      // Simple phone number pattern - match complete numbers only
      PHONE: /\+\d{10,15}|\b\d{10,15}\b/g,
      
      // Email addresses
      EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      
      // URLs
      URL: /(https?:\/\/[^\s]+)|(www\.[^\s]+\.[^\s]+)/g,
      
      // Dates in various formats (including Arabic/English)
      DATE: /(?:\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})|(?:\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s?\d{2,4})|(?:\d{1,2}\s(?:يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s?\d{2,4})/gi,
      
      // Currency amounts (handles $, €, £, ج.م, ر.س, د.إ, etc.)
      AMOUNT: /(?:[$€£¥₹]\s?\d+(?:[,.]\d+)*)|(?:\d+(?:[,.]\d+)*\s?(?:USD|EUR|GBP|JPY|INR|ج\.م|ر\.س|د\.إ|JOD|SAR|AED|EGP))/gi,
      
      // Addresses (simplified pattern)
      ADDRESS: /(?:\d+\s[A-Za-z\u0600-\u06FF]+(?:\s[A-Za-z\u0600-\u06FF]+)*,?\s*(?:[A-Za-z\u0600-\u06FF]+\s*)+,\s*[A-Za-z\u0600-\u06FF\s,]*\d{5}?)/g,
    };
  }


  async classifyText(ocrText, uiLang = 'en') {
    const systemPrompt = this.getSystemPrompt(uiLang);
    
    try {
      console.log('OpenAI API: Starting text classification');
      console.log('OpenAI API: Input text length:', ocrText.length);
      console.log('OpenAI API: Input text sample:', ocrText.substring(0, 100) + (ocrText.length > 100 ? '...' : ''));
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this OCR text from a screenshot and provide intelligent entity extraction with relationship detection:\n\n${ocrText}` }
        ],
        temperature: 0.1, // Slightly higher for better reasoning
        max_tokens: 2000, // More tokens for detailed analysis
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      console.log('OpenAI API: Response received, length:', content.length);
      console.log('OpenAI API: Response sample:', content.substring(0, 200) + (content.length > 200 ? '...' : ''));
      
      let classification = JSON.parse(content);

      // Normalize types to lowercase to avoid validation errors like 'CONTACT'
      if (classification && typeof classification.type === 'string') {
        classification.type = classification.type.toLowerCase();
      }
      if (Array.isArray(classification?.detectedTypes)) {
        classification.detectedTypes = classification.detectedTypes.map(dt => ({
          ...dt,
          type: typeof dt?.type === 'string' ? dt.type.toLowerCase() : dt?.type
        }));
      }
      
      // Map unsupported/alias types (e.g., 'business' → contact/note) before validation
      classification = this.mapAliasTypes(classification);
      
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

  /**
   * Map alias or unsupported types to our canonical set
   * - 'business' → 'contact' if any phone/email/address present or isBusinessDocument, otherwise 'note'
   * - Unknown types → 'note'
   */
  mapAliasTypes(classification) {
    if (!classification || !classification.type) return classification;

    const type = String(classification.type).toLowerCase();
    const VALID_TYPES = new Set(['contact', 'expense', 'event', 'address', 'note', 'document']);

    if (type === 'business') {
      const hasPhone = Boolean(classification?.fields?.phone) || (classification?.entities?.phones?.length > 0);
      const hasEmail = Boolean(classification?.fields?.email) || (classification?.entities?.emails?.length > 0);
      const hasAddr  = (classification?.entities?.addresses?.length > 0);
      const isBizDoc = Boolean(classification?.businessContext?.isBusinessDocument);

      classification.type = (hasPhone || hasEmail || hasAddr || isBizDoc) ? 'contact' : 'note';
      // Preserve the idea that this was a business doc
      if (!classification.fields) classification.fields = {};
      if (!classification.fields.category) classification.fields.category = 'business';

      // Normalize detectedTypes entries
      if (Array.isArray(classification.detectedTypes)) {
        classification.detectedTypes = classification.detectedTypes.map(dt => ({
          ...dt,
          type: String(dt?.type || '').toLowerCase() === 'business' ? 'contact' : String(dt?.type || '').toLowerCase()
        }));
      }
      return classification;
    }

    if (!VALID_TYPES.has(type)) {
      classification.type = 'note';
    }
    return classification;
  }

  getSystemPrompt(uiLang) {
    const lang = uiLang === 'ar' ? 'Arabic' : 'English';
    
    return `
You extract data from OCR text. Be LITERAL. Extract only what you see, don't be creative.

TYPES: contact, expense, event, address, note, document

RULES:
- Extract phone numbers, emails, URLs, addresses exactly as they appear
- For receipts/notes: extract merchant, amount, date if visible
- For amounts: look for currency numbers (e.g., 43.83, 10823.44)
- For dates: extract any date format (Aug 24, Wed Nov 201, 2024-01-15)
- For merchants: extract business/bank names (Uber, BanK-AlAhly, etc.)
- For addresses: each line with location info = separate address
- Don't mix data from different lines
- Don't invent or rewrite anything

JSON OUTPUT:
{
  "type": "contact|expense|event|address|note|document",
  "summary": "brief ${lang} title",
  "confidence": 0.9,
  "entities": {
    "phones": ["exact_phone_numbers"],
    "emails": ["exact_emails"], 
    "urls": ["exact_urls"],
    "addresses": ["each_address_line_separately"],
    "amounts": ["currency_numbers_found"],
    "dates": ["dates_found"]
  },
  "fields": {
    "title": "exact_title_or_null",
    "content": "full_ocr_text",
    "category": "business|travel|personal|receipt|etc",
    "name": "business_or_person_name",
    "phone": "main_phone",
    "email": "main_email", 
    "location": "main_location",
    "merchant": "business_name_for_receipts",
    "amount": "total_amount_number",
    "date": "date_if_present"
  }
}

Be simple. Extract what you see. Don't be smart.`;
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
    
    // Basic validation only - be flexible
    if (!classification.type || !VALID_TYPES.includes(classification.type)) {
      classification.type = 'note'; // Safe fallback
    }
    
    if (!classification.summary) {
      classification.summary = 'Extracted Item';
    }
    
    if (!classification.confidence) {
      classification.confidence = 0.8;
    }
    
    if (!classification.fields) {
      classification.fields = {};
    }
    
    // Ensure content exists
    if (!classification.fields.content) {
      classification.fields.content = 'No content available';
    }
    
    // Use AI-extracted entities if present, otherwise fallback to regex
    if (!classification.entities) {
      const content = classification.fields.content || '';
      classification.entities = this.extractEntities(content);
    }
    
    // Create detectedTypes if missing
    if (!classification.detectedTypes) {
      classification.detectedTypes = [{
        type: classification.type,
        confidence: classification.confidence
      }];
    }
    
    // Split content into blocks
    classification.textBlocks = this.splitTextBlocks(classification.fields.content || '');
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
  
  /**
   * Extract entities from text
   * @param {string} text - The text to extract entities from
   * @returns {Object} - Object containing arrays of extracted entities
   */
  extractEntities(text) {
    if (!text) return {
      phones: [],
      emails: [],
      urls: [],
      dates: [],
      amounts: [],
      addresses: []
    };

    // Extract entities using regex patterns
    const phones = [...new Set((text.match(this.PATTERNS.PHONE) || []).filter(p => p.replace(/[^\d]/g, '').length > 5))];
    const emails = [...new Set(text.match(this.PATTERNS.EMAIL) || [])];
    const urls = [...new Set(text.match(this.PATTERNS.URL) || [])];
    const dates = [...new Set(text.match(this.PATTERNS.DATE) || [])];
    const amounts = [...new Set(text.match(this.PATTERNS.AMOUNT) || [])];
    const addresses = [...new Set(text.match(this.PATTERNS.ADDRESS) || [])];

    return {
      phones,
      emails,
      urls,
      dates,
      amounts,
      addresses
    };
  }

  /**
   * Split text into logical blocks (paragraphs)
   * @param {string} text - The text to split into blocks
   * @returns {Array} - Array of text blocks
   */
  splitTextBlocks(text) {
    if (!text) return [];
    
    // Split by double newlines (paragraphs)
    const blocks = text.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
    
    // If no paragraphs found, try single newlines
    if (blocks.length <= 1) {
      return text.split(/\n/).map(block => block.trim()).filter(Boolean);
    }
    
    return blocks;
  }
}

module.exports = AIService;
