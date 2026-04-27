const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..', 'apps', 'web', 'src', 'i18n', 'locales');
const langs = ['en', 'vi', 'ko', 'ja', 'zh-CN'];

const files = fs.readdirSync(path.join(base, 'en')).filter(f => f.endsWith('.json'));

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (typeof v === 'object' && v !== null) {
      keys.push(...getKeys(v, key));
    } else {
      keys.push(key);
    }
  }
  return keys;
}

let issues = [];
for (const file of files) {
  const enKeys = getKeys(JSON.parse(fs.readFileSync(path.join(base, 'en', file), 'utf8')));
  for (const lang of langs.filter(l => l !== 'en')) {
    const langPath = path.join(base, lang, file);
    if (!fs.existsSync(langPath)) {
      issues.push(`${lang}/${file}: FILE MISSING`);
      continue;
    }
    const langKeys = getKeys(JSON.parse(fs.readFileSync(langPath, 'utf8')));
    const missing = enKeys.filter(k => !langKeys.includes(k));
    const extra = langKeys.filter(k => !enKeys.includes(k));
    if (missing.length) issues.push(`${lang}/${file} MISSING: ${missing.join(', ')}`);
    if (extra.length) issues.push(`${lang}/${file} EXTRA: ${extra.join(', ')}`);
  }
}

if (issues.length === 0) {
  console.log('✅ ALL KEYS MATCH across all languages');
} else {
  console.log(`Found ${issues.length} issues:\n`);
  issues.forEach(i => console.log('  ❌ ' + i));
}
