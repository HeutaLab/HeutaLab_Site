// A tiny pretend AI service for testing the Police Pound without a real key.
//
//   node dev/mock-ai-server.mjs            (listens on http://localhost:1234)
//
// In Grown-ups, choose "Something else (LM Studio, Ollama)", set the address to
// http://localhost:1234/v1, type any key and any model name, then Test.
// It answers the connection test, the Look-Closely coach, the prompt helper and the
// compare check with tidy, child-friendly replies, and speaks OpenAI's format.
// It also accepts Anthropic's /v1/messages so you can see the browser headers.
//
// Put the word MISSING in a description and the coach will ask questions back.
// Put the word BROKEN in an idea and the reply will not be JSON (tests the fallback).

import http from 'node:http';

const PORT = Number(process.env.PORT || 1234);

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

function reply(system, user) {
  if (/connection test/i.test(system)) return 'ready';
  if (/BROKEN/.test(user)) return 'Sorry, here is a poem instead of JSON.';
  if (/Look-Closely Coach/.test(system)) {
    if (/MISSING/.test(user)) {
      return JSON.stringify({ covered: { see: true, details: false, world: false },
        questions: ['What is the character wearing?', 'Where is it, and what is the weather like?'] });
    }
    return JSON.stringify({ covered: { see: true, details: true, world: true }, questions: [] });
  }
  if (/Prompt Helper/.test(system)) {
    return JSON.stringify({
      anchor: 'A friendly round character with thick wobbly outlines, flat bright colours and halftone dots, in a sunny cartoon town.',
      prompts: [
        'Picture 1: the character waves hello outside the police station, thick wobbly outlines, flat bright colours.',
        'Picture 2: the character runs along the street with a big smile, same colours and outlines.',
      ],
      why_this_works: 'It names who, where, what they are doing and the drawing style.',
      platform_notes: 'Paste each prompt on its own.',
      watch_for: 'Check the outlines stay thick in every picture.',
      friendly_note: '',
    });
  }
  if (/compare the prompt/i.test(system)) {
    return JSON.stringify({
      asked_and_missing: ['a red hat'], appeared_unasked: ['a small dog'],
      drift_words: ['fluffy'], questions: ['Did the hat get lost, or only not described?'], looks_copied: false,
    });
  }
  return '{}';
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  let raw = '';
  req.on('data', c => (raw += c));
  req.on('end', () => {
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch (e) {}
    const send = (obj, code = 200) => { res.writeHead(code, { ...cors, 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const hdr = h => (req.headers[h] ? 'yes' : 'no');
    console.log(new Date().toISOString().slice(11, 19), req.method, req.url, '| key sent:', hdr('authorization') === 'yes' || hdr('x-api-key') === 'yes' ? 'yes' : 'no');
    if (req.method === 'POST' && req.url.endsWith('/chat/completions')) {
      const sys = (body.messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n');
      const usr = (body.messages || []).filter(m => m.role === 'user').map(m => m.content).join('\n');
      return send({ choices: [{ message: { role: 'assistant', content: reply(sys, usr) }, finish_reason: 'stop' }] });
    }
    if (req.method === 'POST' && req.url.endsWith('/v1/messages')) {
      const usr = (body.messages || []).map(m => m.content).join('\n');
      return send({ content: [{ type: 'text', text: reply(String(body.system || ''), usr) }], stop_reason: 'end_turn' });
    }
    send({ error: { message: 'not found' } }, 404);
  });
}).listen(PORT, () => console.log('Mock AI service on http://localhost:' + PORT + '/v1'));
