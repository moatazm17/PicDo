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
      
      // Ensure summary is in correct UI language
      classification = await ensureSummaryInUiLang(classification, uiLang, this.openai);
      
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
    return `You extract structured data from OCR text and return **JSON only**.

Language rules:
- "summary" MUST be in ${uiLang === 'ar' ? 'Arabic' : 'English'} (the user's interface language).
- "fields.title" MUST stay in the document's **original language** (do not translate it).

Return exactly this JSON shape (omit nothing, use nulls when unknown):
{
  "type": "event|expense|contact|address|note|document",
  "summary": "string in UI language",
  "fields": {
    "title": "string in original document language",
    "date": "string or null",
    "amount": "string or null",
    "location": "string or null",
    "name": "string or null",
    "phone": "string or null",
    "email": "string or null",
    "content": "string or null",
    "category": "string or null"
  },
  "confidence": 0.0
}

NO prose. NO markdown. JSON only.`;
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
