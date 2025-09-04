/**
 * Entity Extractor
 * Extracts entities like phone numbers, emails, URLs, dates, and amounts from text
 */

// Regular expressions for entity extraction
const PATTERNS = {
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

/**
 * Extract entities from text
 * @param {string} text - The text to extract entities from
 * @returns {Object} - Object containing arrays of extracted entities
 */
export const extractEntities = (text) => {
  if (!text) return {
    phones: [],
    emails: [],
    urls: [],
    dates: [],
    amounts: [],
    addresses: []
  };

  // Extract entities using regex patterns
  const phones = [...new Set((text.match(PATTERNS.PHONE) || []).filter(p => p.replace(/[^\d]/g, '').length > 5))];
  const emails = [...new Set(text.match(PATTERNS.EMAIL) || [])];
  const urls = [...new Set(text.match(PATTERNS.URL) || [])];
  const dates = [...new Set(text.match(PATTERNS.DATE) || [])];
  const amounts = [...new Set(text.match(PATTERNS.AMOUNT) || [])];
  const addresses = [...new Set(text.match(PATTERNS.ADDRESS) || [])];

  return {
    phones,
    emails,
    urls,
    dates,
    amounts,
    addresses
  };
};

/**
 * Split text into logical blocks (paragraphs)
 * @param {string} text - The text to split into blocks
 * @returns {Array} - Array of text blocks
 */
export const splitTextBlocks = (text) => {
  if (!text) return [];
  
  // Split by double newlines (paragraphs)
  const blocks = text.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  
  // If no paragraphs found, try single newlines
  if (blocks.length <= 1) {
    return text.split(/\n/).map(block => block.trim()).filter(Boolean);
  }
  
  return blocks;
};

/**
 * Get entity type icon name
 * @param {string} type - Entity type
 * @returns {string} - Ionicons icon name
 */
export const getEntityIcon = (type) => {
  switch (type) {
    case 'phone': return 'call';
    case 'email': return 'mail';
    case 'url': return 'globe';
    case 'date': return 'calendar';
    case 'amount': return 'cash';
    case 'address': return 'location';
    default: return 'information-circle';
  }
};

/**
 * Get action for entity type
 * @param {string} type - Entity type
 * @param {string} value - Entity value
 * @returns {Object} - Action object with label and handler
 */
export const getEntityAction = (type, value) => {
  switch (type) {
    case 'phone':
      return { 
        label: 'Call',
        handler: () => Linking.openURL(`tel:${value}`) 
      };
    case 'email':
      return { 
        label: 'Email',
        handler: () => Linking.openURL(`mailto:${value}`) 
      };
    case 'url':
      return { 
        label: 'Open',
        handler: () => Linking.openURL(value) 
      };
    case 'date':
      return { 
        label: 'Calendar',
        handler: () => Linking.openURL(`calshow:${new Date(value).getTime()}`) 
      };
    case 'address':
      return { 
        label: 'Maps',
        handler: () => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(value)}`) 
      };
    default:
      return { 
        label: 'Copy',
        handler: () => Clipboard.setString(value) 
      };
  }
};

export default {
  extractEntities,
  splitTextBlocks,
  getEntityIcon,
  getEntityAction
};
