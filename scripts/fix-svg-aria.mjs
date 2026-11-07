import fs from 'fs';
import path from 'path';

function walk(d) {
  let r = [];
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) r = r.concat(walk(p));
    else if (/\.(jsx|tsx)$/.test(f.name)) r.push(p);
  }
  return r;
}

let changed = 0, count = 0;
for (const file of walk('D:/Proyectos/negocios/src')) {
  let s = fs.readFileSync(file, 'utf8');
  const o = s;
  s = s.replace(/<svg\b([^>]*?)>/g, (m, attrs) => {
    if (/aria-hidden|aria-label|aria-labelledby|\brole\s*=/.test(attrs)) return m;
    count++;
    return `<svg aria-hidden="true" focusable="false"${attrs}>`;
  });
  if (s !== o) {
    fs.writeFileSync(file, s, 'utf8');
    changed++;
  }
}
console.log('files', changed, 'svgs', count);
