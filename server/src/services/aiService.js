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
          { role: 'user', content: ocrText }
        ],
        temperature: 0.1,
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

Your task is to:
1. Analyze the provided OCR text
2. Determine the most appropriate type: "event", "expense", "contact", or "address"
3. Extract relevant information and normalize it
4. Return ONLY a valid JSON object matching the exact schema below

JSON Schema (respond with ONLY this JSON, no other text):
{
  "type": "event" | "expense" | "contact" | "address",
  "title": "string (descriptive title)",
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
  "confidence": number (0.0 to 1.0, your confidence in the classification)
}

Rules:
- Choose exactly ONE type that best fits the content
- Fill only the relevant section (event/expense/contact/address), leave others as empty objects
- For dates: use ISO format YYYY-MM-DD
- For times: use 24-hour format HH:mm
- For currencies: detect from context (EGP for Egypt, USD for US, etc.)
- For phone numbers: normalize to E.164 if possible
- If unsure about classification, pick the most likely type and set lower confidence
- NEVER include any text outside the JSON object`;

    if (language === 'ar') {
      return basePrompt + `
- The OCR text may be in Arabic
- Extract information appropriately while maintaining English field names in JSON
- Understand Arabic date/time formats and convert to ISO`;
    }

    return basePrompt;
  }

  validateClassification(classification) {
    const requiredFields = ['type', 'title', 'summary', 'confidence'];
    const validTypes = ['event', 'expense', 'contact', 'address'];
    
    for (const field of requiredFields) {
      if (!(field in classification)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (!validTypes.includes(classification.type)) {
      throw new Error(`Invalid type: ${classification.type}`);
    }
    
    // Ensure all type sections exist
    const typeSections = ['event', 'expense', 'contact', 'address'];
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
      
      default:
        return title;
    }
  }
}

module.exports = AIService;
