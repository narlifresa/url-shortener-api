const OpenAI = require('openai');

let openai;
const getOpenAI = () => {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
};

/**
 * Ask OpenAI to suggest a short, meaningful slug and a one-sentence description
 * for the given URL.
 *
 * Returns: { slug: string, description: string }
 * On failure returns sensible defaults so the caller can proceed.
 */
async function generateSlugAndDescription(originalUrl) {
  const client = getOpenAI();

  const systemPrompt =
    'You are a URL slug generator. Given a URL you must respond with ONLY ' +
    'a valid JSON object with two fields:\n' +
    '  "slug"        — a 4-8 character lowercase alphanumeric/hyphen slug that ' +
    'captures the essence of the page (e.g. "gh-docs", "yt-cats", "wiki-js").\n' +
    '  "description" — one sentence (max 120 chars) describing what the page is about.\n' +
    'No extra text, no markdown fences.';

  const userPrompt = `URL: ${originalUrl}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens: 150,
      temperature: 0.5,
    });

    const raw = completion.choices[0].message.content.trim();
    const parsed = JSON.parse(raw);

    const slug = (parsed.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
    const description = (parsed.description || '').slice(0, 200);

    return { slug: slug || null, description: description || null };
  } catch (err) {
    console.error('[AI] generateSlugAndDescription error:', err.message);
    return { slug: null, description: null };
  }
}

module.exports = { generateSlugAndDescription };
