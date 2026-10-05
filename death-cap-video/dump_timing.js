const fs = require('fs');
global.document = {};
eval(fs.readFileSync(__dirname + '/src/core.js', 'utf8') + ';global.TIMING=TIMING;global.CHUNKS=CHUNKS;');
const out = { segs: TIMING.segs.map(s => ({ id: s.id, start: s.start, end: s.end, words: s.words.map(w => ({ text: w.text, start: w.start, end: w.end })) })), chunks: CHUNKS.map(c => ({ start: c.start, end: c.end, text: c.words.map(w => w.text).join(' ') })) };
fs.writeFileSync(__dirname + '/out/timing.json', JSON.stringify(out, null, 1));
console.log('ok');
