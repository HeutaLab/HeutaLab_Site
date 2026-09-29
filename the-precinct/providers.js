// The Precinct: the attendee's own AI key. The key is kept in this browser
// only and sent straight to the AI service the attendee chose (Google,
// OpenAI or Anthropic). It never goes to heutalab.com. All three services
// accept calls from a web page (checked 2026-09-29).

import { sharedDeskOpen } from './desk.js';

export const PROVIDERS = {
  gemini: {
    label: 'Google Gemini', short: 'Gemini', model: 'gemini-3.8-flash',
    keyUrl: 'https://aistudio.google.com/apikey', keySite: 'Google AI Studio',
    note: 'Free to start: a Google account gets a key with a free allowance.',
    looksRight: (k) => /^AIza[\w-]{30,}$/.test(k),
  },
  openai: {
    label: 'OpenAI', short: 'OpenAI', model: 'gpt-6-luna',
    keyUrl: 'https://platform.openai.com/api-keys', keySite: 'the OpenAI platform',
    note: 'Pay as you go: the account needs credit before the key works.',
    looksRight: (k) => /^sk-[\w-]{20,}$/.test(k),
  },
  anthropic: {
    label: 'Anthropic Claude', short: 'Claude', model: 'claude-opus-5',
    keyUrl: 'https://console.anthropic.com/settings/keys', keySite: 'the Anthropic Console',
    note: 'Pay as you go: the account needs credit before the key works.',
    looksRight: (k) => /^sk-ant-[\w-]{20,}$/.test(k),
  },
};

// ---------- the saved key ----------

const KEY_STORE = 'precinct_ai_key';

export function loadKey() {
  try {
    const k = JSON.parse(localStorage.getItem(KEY_STORE) || 'null');
    if (k && Object.hasOwn(PROVIDERS, k.provider) && typeof k.key === 'string' && k.key) return k;
  } catch (e) {}
  return null;
}
export function saveKey(provider, key) {
  try { localStorage.setItem(KEY_STORE, JSON.stringify({ provider, key })); return true; } catch (e) { return false; }
}
export function forgetKey() {
  try { localStorage.removeItem(KEY_STORE); } catch (e) {}
}
// Enough to recognise a key without showing it.
export const maskKey = (key) => '…' + key.slice(-4);

// ---------- one structured request ----------

// Sends one request and returns { data } (the parsed JSON the schema asked
// for) or { fail, message }. fail is one of: bad_key, no_credit, busy,
// timeout, network, blocked, refusal, max_tokens, unparseable, rejected.
// blocked: OpenAI's error replies (a wrong key, for one) lack the header a
// browser needs to read them, so the page only sees a failed connection.
export async function askAI({ provider, key }, { system, user, schema, effort, maxTokens, timeoutMs }) {
  const call = CALLS[provider];
  if (!call) return { fail: 'rejected', message: 'Unknown AI service.' };
  let res;
  try {
    res = await fetch(call.url(PROVIDERS[provider].model), {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: call.headers(key),
      body: JSON.stringify(call.body({ model: PROVIDERS[provider].model, system, user, schema, effort, maxTokens })),
    });
  } catch (e) {
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) return { fail: 'timeout' };
    return { fail: provider === 'openai' && navigator.onLine !== false ? 'blocked' : 'network' };
  }
  let body = null;
  try { body = await res.json(); } catch (e) {}
  if (!res.ok) return { fail: call.failure(res.status, body), message: errorText(body) };
  const out = call.read(body);
  if (out.fail) return out;
  try { return { data: JSON.parse(out.text) }; } catch (e) { return { fail: 'unparseable' }; }
}

const errorText = (b) => String((b && b.error && (b.error.message || b.error.type)) || '').slice(0, 200);

// Status codes shared by all three.
function commonFailure(status) {
  if (status === 401 || status === 403) return 'bad_key';
  if (status === 402) return 'no_credit';
  if (status === 408 || status === 409 || status === 429 || status >= 500) return 'busy';
  return 'rejected';
}

const CALLS = {
  gemini: {
    url: (model) => 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
    headers: (key) => ({ 'content-type': 'application/json', 'x-goog-api-key': key }),
    body: ({ system, user, schema, maxTokens }) => ({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: maxTokens },
    }),
    failure: (status, b) => {
      const reason = JSON.stringify((b && b.error && b.error.details) || '');
      const code = b && b.error && b.error.status;
      if (/API_KEY_INVALID|API_KEY_EXPIRED/.test(reason) || status === 401 || status === 403) return 'bad_key';
      if (code === 'RESOURCE_EXHAUSTED') return 'busy';
      return commonFailure(status);
    },
    read: (b) => {
      if (b && b.promptFeedback && b.promptFeedback.blockReason) return { fail: 'refusal' };
      const c = b && b.candidates && b.candidates[0];
      if (!c) return { fail: 'unparseable' };
      if (c.finishReason === 'SAFETY' || c.finishReason === 'PROHIBITED_CONTENT' || c.finishReason === 'RECITATION') return { fail: 'refusal' };
      if (c.finishReason === 'MAX_TOKENS') return { fail: 'max_tokens' };
      const text = ((c.content && c.content.parts) || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
      return { text };
    },
  },

  openai: {
    url: () => 'https://api.openai.com/v1/responses',
    headers: (key) => ({ 'content-type': 'application/json', authorization: 'Bearer ' + key }),
    body: ({ model, system, user, schema, maxTokens }) => ({
      model, instructions: system, input: user, max_output_tokens: maxTokens,
      text: { format: { type: 'json_schema', name: 'precinct', schema, strict: true } },
    }),
    failure: (status, b) => {
      const code = b && b.error && (b.error.code || b.error.type);
      if (code === 'invalid_api_key') return 'bad_key';
      if (code === 'insufficient_quota') return 'no_credit';
      return commonFailure(status);
    },
    read: (b) => {
      if (b && b.status === 'incomplete') return { fail: (b.incomplete_details && b.incomplete_details.reason) === 'content_filter' ? 'refusal' : 'max_tokens' };
      const parts = ((b && b.output) || []).filter((o) => o.type === 'message').flatMap((o) => o.content || []);
      if (parts.some((p) => p.type === 'refusal')) return { fail: 'refusal' };
      return { text: parts.filter((p) => p.type === 'output_text').map((p) => p.text).join('') };
    },
  },

  anthropic: {
    url: () => 'https://api.anthropic.com/v1/messages',
    headers: (key) => ({
      'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01',
      // Required for a call made straight from a web page with the user's own key.
      'anthropic-dangerous-direct-browser-access': 'true',
      // Lets a request the model declines be re-run on a fallback model.
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    }),
    body: ({ model, system, user, schema, effort, maxTokens }) => ({
      model, max_tokens: maxTokens, system, fallbacks: 'default',
      output_config: { effort, format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: user }],
    }),
    failure: (status, b) => {
      const type = b && b.error && b.error.type;
      if (type === 'authentication_error' || type === 'permission_error') return 'bad_key';
      if (type === 'billing_error') return 'no_credit';
      if (type === 'invalid_request_error' && /credit balance/i.test(errorText(b))) return 'no_credit';
      if (type === 'overloaded_error' || type === 'rate_limit_error') return 'busy';
      return commonFailure(status);
    },
    read: (b) => {
      if (b.stop_reason === 'refusal') return { fail: 'refusal' };
      if (b.stop_reason === 'max_tokens') return { fail: 'max_tokens' };
      // With thinking on, content[0] can be a thinking block; the answer is the text block.
      return { text: ((b.content || []).find((c) => c.type === 'text') || {}).text || '' };
    },
  },
};

// Worth a stock answer: slow, busy or briefly broken. The rest need the
// attendee to do something (fix the key, add credit, reword).
export const isTransient = (fail) => ['timeout', 'network', 'busy', 'max_tokens', 'unparseable'].includes(fail);

// onKeyPage: the attendee is already on the API key page, so don't send them there.
export function failureMessage(fail, provider, onKeyPage = false) {
  const p = PROVIDERS[provider] ? PROVIDERS[provider].short : 'your AI';
  const there = onKeyPage ? '' : ' on the API key page';
  if (fail === 'bad_key') return p + ' refused your key. Check it' + there + ', or make a new one.';
  if (fail === 'blocked') return p + ' didn\u2019t accept the request. It doesn\u2019t tell web pages why, but it is almost always a wrong or deleted key: check it' + there + ', or make a new one.';
  if (fail === 'no_credit') return 'Your ' + p + ' account has no credit left. Add some, or switch to a Gemini key (free to start)' + there + '.';
  if (fail === 'refusal') return p + ' declined that one. Try rewording it.';
  if (fail === 'rejected') return p + ' turned the request down. Try again, or check your key' + there + '.';
  return p + ' didn’t answer in time. Try again in a moment.';
}

// A tiny request to check a key works before relying on it.
export function testKey(k) {
  return askAI(k, {
    system: 'Reply with the JSON object requested.', user: 'Say ok.',
    schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false },
    effort: 'low', maxTokens: 1000, timeoutMs: 20000,
  });
}

// ---------- when a personal key is needed ----------


// From PERSONAL_KEYS_FROM everyone needs their own key. ?personal=1 on any
// Precinct page previews that mode in this tab (for trying it out before
// the date); ?personal=0 turns the preview off.
export function personalKeysNeeded() {
  try {
    const q = new URLSearchParams(location.search).get('personal');
    if (q === '1') sessionStorage.setItem('precinct_preview_personal', '1');
    if (q === '0') sessionStorage.removeItem('precinct_preview_personal');
    if (sessionStorage.getItem('precinct_preview_personal') === '1') return true;
  } catch (e) {}
  return !sharedDeskOpen();
}
