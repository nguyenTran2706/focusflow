/**
 * Auto-translate i18n files from English to all target languages.
 *
 * Usage:
 *   node scripts/translate-i18n.js            # translate only MISSING keys
 *   node scripts/translate-i18n.js --force     # re-translate ALL keys (overwrite)
 *   node scripts/translate-i18n.js --file landing.json   # only translate one file
 *
 * Uses free Google Translate (no API key needed).
 * For production-grade quality, swap in Google Cloud Translation API.
 */

const fs = require('fs');
const path = require('path');
const translate = require('google-translate-api-x');

// ── Config ───────────────────────────────────────────────────────────────────
const LOCALES_DIR = path.join(__dirname, '..', 'apps', 'web', 'src', 'i18n', 'locales');
const SOURCE_LANG = 'en';
const TARGET_LANGS = [
  { code: 'vi', googleCode: 'vi' },    // Vietnamese
  { code: 'ko', googleCode: 'ko' },    // Korean
  { code: 'ja', googleCode: 'ja' },    // Japanese
  { code: 'zh-CN', googleCode: 'zh-CN' }, // Chinese Simplified
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Flatten nested JSON into dot-delimited keys: { a: { b: "c" } } → { "a.b": "c" } */
function flatten(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) {
      Object.assign(result, flatten(v, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

/** Unflatten dot-delimited keys back into nested JSON */
function unflatten(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

/** Preserve {{interpolation}} placeholders during translation */
function extractPlaceholders(text) {
  const placeholders = [];
  const replaced = text.replace(/\{\{([^}]+)\}\}/g, (match, name) => {
    const token = `__PH${placeholders.length}__`;
    placeholders.push(match);
    return token;
  });
  return { replaced, placeholders };
}

function restorePlaceholders(text, placeholders) {
  let result = text;
  placeholders.forEach((ph, i) => {
    // Handle various ways Google might mangle the placeholder
    const patterns = [
      `__PH${i}__`,
      `__ PH${i} __`,
      `__PH ${i}__`,
      `__ PH ${i} __`,
      `__ph${i}__`,
      `__ ph${i} __`,
    ];
    for (const p of patterns) {
      result = result.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ph);
    }
  });
  return result;
}

/** Translate a single string, preserving {{placeholders}} */
async function translateString(text, targetLang) {
  if (!text || typeof text !== 'string') return text;

  // Don't translate strings that are just placeholders, URLs, or brand names
  if (/^(\{\{[^}]+\}\}|https?:\/\/|[A-Z][a-z]+ ?[A-Z]?[a-z]*|©.*)$/.test(text.trim())) {
    return text;
  }

  const { replaced, placeholders } = extractPlaceholders(text);

  try {
    const res = await translate(replaced, { from: 'en', to: targetLang });
    return restorePlaceholders(res.text, placeholders);
  } catch (err) {
    console.warn(`    ⚠ Failed to translate "${text.substring(0, 40)}...": ${err.message}`);
    return text; // fallback to English
  }
}

/** Small delay to avoid rate-limiting */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const forceAll = args.includes('--force');
  const fileFlag = args.indexOf('--file');
  const singleFile = fileFlag !== -1 ? args[fileFlag + 1] : null;

  // Get all English JSON files
  let files = fs.readdirSync(path.join(LOCALES_DIR, SOURCE_LANG)).filter((f) => f.endsWith('.json'));
  if (singleFile) {
    files = files.filter((f) => f === singleFile);
    if (files.length === 0) {
      console.error(`❌ File "${singleFile}" not found in ${SOURCE_LANG}/`);
      process.exit(1);
    }
  }

  console.log(`\n🌐 Auto-translating ${files.length} file(s) → ${TARGET_LANGS.map((l) => l.code).join(', ')}`);
  console.log(`   Mode: ${forceAll ? 'FORCE (re-translate all)' : 'INCREMENTAL (missing keys only)'}\n`);

  let totalTranslated = 0;
  let totalSkipped = 0;

  for (const file of files) {
    const enPath = path.join(LOCALES_DIR, SOURCE_LANG, file);
    const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enFlat = flatten(enData);
    const enKeys = Object.keys(enFlat);

    for (const lang of TARGET_LANGS) {
      const langDir = path.join(LOCALES_DIR, lang.code);
      const langPath = path.join(langDir, file);

      // Load existing translations (if any)
      let existingFlat = {};
      if (fs.existsSync(langPath) && !forceAll) {
        existingFlat = flatten(JSON.parse(fs.readFileSync(langPath, 'utf8')));
      }

      // Find keys that need translation
      const keysToTranslate = forceAll ? enKeys : enKeys.filter((k) => !(k in existingFlat));

      if (keysToTranslate.length === 0) {
        totalSkipped += enKeys.length;
        continue;
      }

      console.log(`  📝 ${lang.code}/${file} — translating ${keysToTranslate.length} key(s)...`);

      // Translate each missing key
      const translated = { ...existingFlat };
      for (const key of keysToTranslate) {
        translated[key] = await translateString(enFlat[key], lang.googleCode);
        totalTranslated++;
        // Small delay between requests to be nice to Google
        await sleep(100);
      }

      // Ensure directory exists
      if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });

      // Write back as nested JSON (matching English key order)
      const ordered = {};
      for (const key of enKeys) {
        ordered[key] = translated[key] ?? enFlat[key];
      }
      const nested = unflatten(ordered);
      fs.writeFileSync(langPath, JSON.stringify(nested, null, 2) + '\n', 'utf8');
    }
  }

  console.log(`\n✅ Done! Translated ${totalTranslated} strings, skipped ${totalSkipped} existing.\n`);
}

main().catch((err) => {
  console.error('❌ Translation failed:', err);
  process.exit(1);
});
