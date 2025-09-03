/**
 * Robust language detection from Accept-Language header
 * @param {string} header - Accept-Language header value
 * @returns {'ar' | 'en'} - Detected UI language
 */
export function detectUiLang(header) {
  if (!header) return 'en';
  
  const lower = header.toLowerCase();
  
  // Quick parse: split by comma, take first tag, normalize to base
  const first = lower.split(',')[0].trim(); // e.g. "ar-eg" or "en-us"
  
  if (first.startsWith('ar')) return 'ar';
  
  // Also handle if "ar;q=1.0" isn't first:
  if (lower.includes('ar')) return 'ar';
  
  return 'en';
}
