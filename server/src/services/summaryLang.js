const OpenAI = require('openai');

const AR_REGEX = /[\u0600-\u06FF]/; // Arabic char range

/**
 * Ensures summary is in the correct UI language
 * @param {Object} payload - AI response payload
 * @param {string} uiLang - UI language ('ar' or 'en')
 * @param {OpenAI} openai - OpenAI client instance
 * @returns {Object} - Payload with corrected summary
 */
async function ensureSummaryInUiLang(payload, uiLang, openai) {
  if (uiLang === 'ar' && (!payload.summary || !AR_REGEX.test(payload.summary))) {
    console.log('Summary not in Arabic, translating...');
    const t = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Translate the following phrase into Arabic. Reply with the translation only.' },
        { role: 'user', content: payload.summary || payload.fields?.title || 'بدون عنوان' }
      ],
      temperature: 0.1
    });
    payload.summary = t.choices[0].message.content.trim();
    console.log('Translated summary to Arabic:', payload.summary);
  }
  
  if (uiLang === 'en' && payload.summary && AR_REGEX.test(payload.summary)) {
    console.log('Summary in Arabic but UI is English, translating...');
    const t = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Translate the following phrase into English. Reply with the translation only.' },
        { role: 'user', content: payload.summary }
      ],
      temperature: 0.1
    });
    payload.summary = t.choices[0].message.content.trim();
    console.log('Translated summary to English:', payload.summary);
  }
  
  return payload;
}

module.exports = { ensureSummaryInUiLang };
