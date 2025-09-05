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
      // International phone number formats
      PHONE: /(?:(?:\+|00)[1-9]\d{0,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g,
      
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

  /**
   * Refine and split addresses using the LLM with line-level reasoning
   * Returns a normalized list of address objects with confidence and context
   * @param {string} ocrText
   * @param {string[]} candidateAddresses
   * @param {string} uiLang
   */
  async refineAddresses(ocrText, candidateAddresses = [], uiLang = 'en') {
    try {
      if (!ocrText && (!candidateAddresses || candidateAddresses.length === 0)) {
        return [];
      }

      const prompt = `You are an address intelligence module. Given OCR text (possibly noisy) and a list of candidate address lines, output a clean list of COMPLETE individual addresses with confidence and optional business context. Split multi-address blocks. Avoid fragments like single words (e.g., just 'شارع'). Use the user's UI language context (${uiLang === 'ar' ? 'Arabic' : 'English'}) when helpful.

Return ONLY JSON with this shape:
{
  "addresses": [
    {
      "fullAddress": "...", 
      "components": {"street": "", "district": "", "city": "", "country": ""},
      "businessContext": "branch name or company if inferred",
      "isMainLocation": false,
      "confidence": 0.0
    }
  ]
}

Guidelines:
- Prefer longer, multi-token addresses; discard single-token fragments
- If multiple branches/locations exist, return each as a separate item
- Extract components when obvious; leave empty strings when unsure
- Confidence must be between 0 and 1
- Do not duplicate addresses
`;

      const userContent = `OCR_TEXT:\n${ocrText}\n\nCANDIDATE_ADDRESSES:\n${(candidateAddresses || []).join('\n')}`;

      const resp = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.1,
        max_tokens: 1200,
        response_format: { type: 'json_object' }
      });

      const content = resp.choices?.[0]?.message?.content || '{}';
      const json = JSON.parse(content);
      const addresses = Array.isArray(json.addresses) ? json.addresses : [];

      // Normalize objects and clamp confidence
      return addresses
        .map(a => ({
          fullAddress: (a?.fullAddress || '').trim(),
          components: {
            street: a?.components?.street || '',
            district: a?.components?.district || '',
            city: a?.components?.city || '',
            country: a?.components?.country || ''
          },
          businessContext: a?.businessContext || '',
          isMainLocation: Boolean(a?.isMainLocation),
          confidence: Math.max(0, Math.min(1, Number(a?.confidence ?? 0)))
        }))
        .filter(a => a.fullAddress && a.fullAddress.length >= 8);
    } catch (e) {
      console.error('Address refinement failed:', e.message);
      return [];
    }
  }

  /**
   * Extract expenses and events with confidence using the LLM
   * @param {string} ocrText
   * @param {string} uiLang
   * @returns {{expenses: Array, events: Array}}
   */
  async extractExpensesAndEvents(ocrText, uiLang = 'en') {
    try {
      if (!ocrText || ocrText.trim().length === 0) return { expenses: [], events: [] };

      const prompt = `You extract structured EXPENSES and EVENTS from noisy OCR text. Return JSON only.

Schema:
{
  "expenses": [
    {
      "merchant": "",
      "amount": 0,
      "currency": "",
      "date": "YYYY-MM-DD or original",
      "items": [{"name": "", "qty": 1, "price": 0}],
      "tax": 0,
      "paymentMethod": "",
      "reference": "",
      "confidence": 0.0
    }
  ],
  "events": [
    {
      "title": "",
      "start": "ISO or original",
      "end": "ISO or original or empty",
      "venue": "",
      "city": "",
      "url": "",
      "confidence": 0.0
    }
  ]
}

Rules:
- Only include entries with confidence >= 0.5
- For EXPENSE, prefer explicit totals (Total/المجموع/TTC)
- For EVENT, prefer future-looking invitations; skip news/stories
`;

      const resp = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: ocrText }
        ],
        temperature: 0.1,
        max_tokens: 1400,
        response_format: { type: 'json_object' }
      });

      const content = resp.choices?.[0]?.message?.content || '{}';
      const json = JSON.parse(content);
      const expenses = Array.isArray(json.expenses) ? json.expenses : [];
      const events = Array.isArray(json.events) ? json.events : [];

      // Normalize and filter by confidence
      const normExpenses = expenses
        .map(e => ({
          merchant: (e?.merchant || '').trim(),
          amount: Number(e?.amount ?? 0),
          currency: (e?.currency || '').trim(),
          date: (e?.date || '').trim(),
          items: Array.isArray(e?.items) ? e.items : [],
          tax: Number(e?.tax ?? 0),
          paymentMethod: (e?.paymentMethod || '').trim(),
          reference: (e?.reference || '').trim(),
          confidence: Math.max(0, Math.min(1, Number(e?.confidence ?? 0)))
        }))
        .filter(e => e.confidence >= 0.5 && (e.amount > 0 || e.merchant));

      const normEvents = events
        .map(ev => ({
          title: (ev?.title || '').trim(),
          start: (ev?.start || '').trim(),
          end: (ev?.end || '').trim(),
          venue: (ev?.venue || '').trim(),
          city: (ev?.city || '').trim(),
          url: (ev?.url || '').trim(),
          confidence: Math.max(0, Math.min(1, Number(ev?.confidence ?? 0)))
        }))
        .filter(ev => ev.confidence >= 0.5 && (ev.title || ev.start || ev.venue));

      return { expenses: normExpenses, events: normEvents };
    } catch (e) {
      console.error('extractExpensesAndEvents failed:', e.message);
      return { expenses: [], events: [] };
    }
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
You are an advanced AI system for intelligent document analysis and entity extraction. Your task is to understand document context, extract entities with relationships, and provide smart classification.

########################## INTELLIGENT ANALYSIS ##########################
1. **Document Understanding**: Analyze the document type and business context
2. **Entity Relationship Detection**: Understand how different pieces of information relate to each other
3. **Smart Grouping**: Group related entities (e.g., multiple locations for same business)
4. **Context-Aware Extraction**: Extract entities with their business context and relationships

########################## ENHANCED ENTITY EXTRACTION ##########################
For each document, perform intelligent entity extraction:

**BUSINESS CONTEXT DETECTION:**
- Identify if this is a business document (business card, flyer, directory listing)
- Detect business name, type, and category
- Understand if multiple locations belong to same business

**SMART ADDRESS HANDLING:**
- Parse complete addresses, not fragments
- Detect multiple locations for same business
- Separate individual addresses (don't merge unrelated ones)
- Include context (which business/person each address belongs to)
- Handle geographic hierarchies (country > city > district > street)

**INTELLIGENT PHONE EXTRACTION:**
- Detect all phone numbers with context
- Handle local numbers (add country context if business context suggests it)
- Identify main vs branch numbers
- Associate phone numbers with specific locations/businesses

**RELATIONSHIP MAPPING:**
- Map which phone numbers belong to which addresses
- Identify business hierarchies (main office vs branches)
- Connect contact information to specific locations

########################## SMART CLASSIFICATION ##########################
Primary classification with context awareness:

1. **CONTACT** - Business or personal contact information
   - Multi-location businesses (like exchange offices, banks)
   - Service providers with multiple branches
   - Professional contacts with office locations

2. **BUSINESS** - Business directory or promotional content
   - Company information with multiple locations
   - Service offerings and contact details
   - Business categories and specializations

3. **ADDRESS** - Location sharing or directions
   - Specific location information
   - Geographic references and landmarks

4. **EVENT** - Invitations or event announcements
5. **EXPENSE** - Financial transactions or receipts
6. **NOTE** - General information or text

########################## REQUIRED JSON OUTPUT ##########################
{
  "type": "primary_classification",
  "summary": "brief_description_in_${lang}",
  "confidence": 0.9,
  "businessContext": {
    "isBusinessDocument": true/false,
    "businessName": "extracted_business_name",
    "businessType": "category_or_industry",
    "hasMultipleLocations": true/false
  },
  "entities": {
    "phones": [
      {
        "number": "full_phone_number",
        "type": "main|branch|mobile|fax",
        "context": "which_business_or_location",
        "isLocal": true/false
      }
    ],
    "emails": [
      {
        "address": "email_address",
        "context": "business_or_personal"
      }
    ],
    "addresses": [
      {
        "fullAddress": "complete_address_string",
        "components": {
          "street": "street_info",
          "district": "district_name", 
          "city": "city_name",
          "country": "country_name"
        },
        "businessContext": "which_business_this_belongs_to",
        "isMainLocation": true/false
      }
    ],
    "urls": ["extracted_urls"],
    "businessInfo": {
      "names": ["business_names"],
      "categories": ["business_categories"],
      "services": ["services_offered"],
      "hours": ["operating_hours"],
      "specializations": ["areas_of_expertise"]
    }
  },
  "detectedTypes": [
    {
      "type": "classification",
      "confidence": 0.9,
      "reasoning": "why_this_classification"
    }
  ],
  "fields": {
    "title": "document_title_or_business_name",
    "name": "primary_business_or_person_name",
    "phone": "primary_phone_number",
    "email": "primary_email",
    "location": "primary_or_summary_location",
    "category": "business_category_or_document_type",
    "content": "cleaned_and_organized_text"
  }
}

########################## CRITICAL INSTRUCTIONS ##########################
1. **NEVER fragment addresses** - extract complete, meaningful addresses
2. **Group related information** - if 5 locations belong to same business, show that relationship
3. **Preserve context** - don't lose the connection between phone numbers and their locations
4. **Smart local number handling** - if business context suggests a country, handle local numbers appropriately
5. **Quality over quantity** - better to have fewer, accurate entities than many fragments
6. **Business intelligence** - understand document purpose and extract accordingly

Return ONLY the JSON object, no additional text.`;
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
    
    // If detectedTypes is missing, create it from primary type
    if (!classification.detectedTypes) {
      classification.detectedTypes = [{
        type: classification.type,
        confidence: classification.confidence,
        data: { ...classification.fields }
      }];
    }
    
    // Extract entities from the content
    const content = classification.fields.content || '';
    classification.entities = this.extractEntities(content);
    
    // Split content into blocks
    classification.textBlocks = this.splitTextBlocks(content);
    
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
    // But if it looks like an address, reclassify it
    if (classification.type === 'contact') {
      if (!(classification.fields.phone || classification.fields.email)) {
        // Check if it's actually an address
        const text = (classification.fields.content || '').toLowerCase();
        const addressKeywords = ['street', 'st', 'road', 'rd', 'avenue', 'ave', 'city', 
                                'شارع', 'ش', 'طريق', 'مدينة', 'عنوان', 'داخل', 'بجوار'];
        
        if (addressKeywords.some(keyword => text.includes(keyword))) {
          // Reclassify as address
          classification.type = 'address';
          classification.fields.location = classification.fields.content;
          delete classification.fields.phone;
          delete classification.fields.email;
        } else {
          throw new Error('Contact type must include at least a phone or email');
        }
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
