import fs from 'fs';
import path from 'path';

function walk(d, exts) {
  let r = [];
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) { if (f.name === 'node_modules' || f.name === 'dist') continue; r = r.concat(walk(p, exts)); }
    else if (exts.some(e => f.name.endsWith(e))) r.push(p);
  }
  return r;
}

let stats = { bounce: 0, tall: 0, files: 0 };
for (const file of walk('D:/Proyectos/negocios/src', ['.jsx', '.tsx', '.js', '.ts', '.html'])) {
  let s = fs.readFileSync(file, 'utf8');
  const o = s;
  const b = (s.match(/\banimate-bounce\b/g) || []).length;
  s = s.replace(/\banimate-bounce\b/g, 'animate-pulse-soft');
  // replace transition-all class token (not "transition-all ..." in prose, but class usage)
  const t = (s.match(/\btransition-all\b/g) || []).length;
  s = s.replace(/\btransition-all\b/g, 'transition');
  if (s !== o) {
    fs.writeFileSync(file, s, 'utf8');
    stats.files++;
    stats.bounce += b; stats.tall += t;
  }
}
console.log(stats);
