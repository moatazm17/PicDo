const OpenAI = require('openai');

class AIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async classifyText(ocrText, language = 'en') {
    const systemPrompt = this.getSystemPrompt(language);
    
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
      
      const classification = JSON.parse(content);
      
      // Validate the response structure
      this.validateClassification(classification);
      
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

  getSystemPrompt(language) {
    const basePrompt = `You are an AI that analyzes OCR text from screenshots and classifies them into actionable items.

CRITICAL: This OCR text comes from screenshots which may include browser UI, tabs, navigation elements, and noise. Your job is to INTELLIGENTLY FILTER OUT noise and focus on the MAIN DOCUMENT CONTENT.

CONTENT FILTERING RULES:
1. IGNORE browser UI: tabs, URLs, navigation, usernames, platform names
2. IGNORE metadata: timestamps, view counts, social media handles  
3. FOCUS on main content: the actual document, form, receipt, or text
4. IDENTIFY the primary content vs secondary UI noise
5. EXTRACT the meaningful information that a human would care about

Your task is to:
1. FIRST: Clean and filter the OCR text to identify the main content
2. SECOND: Determine the most appropriate type: "event", "expense", "contact", "address", "note", or "document"
3. THIRD: Extract relevant information and normalize it
4. FOURTH: Create user-friendly titles that help users recognize items
5. Return ONLY a valid JSON object matching the exact schema below

JSON Schema (respond with ONLY this JSON, no other text):
{
  "type": "event" | "expense" | "contact" | "address" | "note" | "document",
  "title": "string (user-friendly title for history list - see title rules below)",
  "summary": "string (short summary for history list)",
  "event": {
    "date": "YYYY-MM-DD" (ISO date),
    "time": "HH:mm" (24-hour format),
    "location": "string",
    "url": "string or empty"
  },
  "expense": {
    "amount": number (numeric value only),
    "currency": "EGP" | "USD" | "EUR" | "SAR" | "AED" (detect from context),
    "merchant": "string",
    "date": "YYYY-MM-DD"
  },
  "contact": {
    "name": "string",
    "phone": "string (E.164 format if possible, e.g. +201234567890)"
  },
  "address": {
    "full": "string (complete address)",
    "mapsQuery": "string (optimized for maps search)"
  },
  "note": {
    "content": "string (cleaned main content only - NO browser UI noise)",
    "category": "string (like 'todo list', 'lyrics', 'quote', 'recipe', 'personal note')"
  },
  "document": {
    "title": "string (document title)",
    "content": "string (cleaned main content only - NO browser UI noise)",
    "category": "string (like 'government form', 'business document', 'instruction', 'reference', 'legal', 'medical')"
  },
  "confidence": number (0.0 to 1.0, your confidence in the classification)
}

TITLE RULES - Create user-friendly titles that help users recognize items:
- For CONTACTS: Use "Name - Role" format (e.g. "Dr. John Smith - Physical Therapist", "Sarah's Dental Office", "Mike - Car Mechanic")
- For EVENTS: Use "Event Name" or "Event at Location" (e.g. "Meeting with Dr. Smith", "Appointment at City Hospital")
- For EXPENSES: Use "Store/Service Name" (e.g. "Starbucks Coffee", "Uber Ride", "Amazon Purchase")
- For ADDRESSES: Use recognizable location name (e.g. "City Hospital", "John's Home Address", "Office Location")
- For NOTES: Use content-based title (e.g. "Shopping List", "Meeting Notes", "Recipe for Pasta")
- For DOCUMENTS: Use the main document title (extract from content, not invent)
- PRIORITY: Names > Recognizable Places > Document Titles > Descriptive Content > Job Titles/Generic Terms
- Keep titles concise (under 40 characters) but informative
- Users remember NAMES and PLACES better than job titles or generic descriptions

SMART CLASSIFICATION LOGIC:
- Look for PATTERNS, not specific examples
- Official/formal language + instructions/procedures → "document" 
- Casual/personal language + lists/thoughts → "note"
- Names + phone numbers → "contact"
- Money amounts + merchant names → "expense"  
- Dates + times + locations → "event"
- Street addresses + location names → "address"
- Judge by TONE and STRUCTURE, not specific keywords

General Rules:
- Choose exactly ONE type that best fits the content
- Fill only the relevant section (event/expense/contact/address), leave others as empty objects
- For dates: use ISO format YYYY-MM-DD
- For times: use 24-hour format HH:mm
- For currencies: detect from context (EGP for Egypt, USD for US, etc.)
- CRITICAL: NEVER modify, guess, or "fix" numbers, dates, or specific details from OCR text
- Use EXACT text from OCR - do not correct what you think are "errors"  
- If a phone number appears as "01555000111" in OCR, use EXACTLY "01555000111" - do NOT change it to "+201155000111"
- If unsure about classification, pick the most likely type and set lower confidence
- NEVER include any text outside the JSON object
- NEVER hallucinate or make up information not present in the OCR text
- If the text appears to be a to-do list, classify it as a note with category "todo list"
- If you cannot confidently determine a type, default to "expense" with low confidence
- Use ONLY information that appears in the OCR text - do not invent names, dates, or other details
- If the OCR text is garbled or unclear, set confidence to 0.1 and use a generic title based on visible text
- The title should be a direct quote from the OCR text whenever possible
- PRESERVE EXACT FORMATTING: If OCR shows "015", do not change it to "011" or add country codes`;

    if (language === 'ar') {
      return basePrompt + `

ARABIC LANGUAGE HANDLING:
- The OCR text may be in Arabic, English, or mixed languages
- DETECT the primary language of the content automatically
- If content is primarily Arabic: respond with Arabic titles/summaries for better UX
- If content is primarily English: respond with English titles/summaries
- For mixed content: use the language that appears most prominently
- Always maintain English field names in JSON structure
- Understand Arabic date/time formats (e.g., ٢٠٢٤/١٢/٢٥) and convert to ISO format
- For Arabic numbers: convert Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) to standard digits (0123456789)
- EXAMPLE: If Arabic business card → Arabic title: "د. أحمد محمد - طبيب أسنان" not "Dr. Ahmed Mohamed - Dentist"
- This provides better user experience for Arabic speakers`;
    }

    return basePrompt;
  }

  validateClassification(classification) {
    const requiredFields = ['type', 'title', 'summary', 'confidence'];
    const validTypes = ['event', 'expense', 'contact', 'address', 'note', 'document'];
    
    for (const field of requiredFields) {
      if (!(field in classification)) {
        throw new Error(`Missing required field: ${field}`);
      }
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
