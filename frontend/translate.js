import fs from 'fs';
import path from 'path';

const locales = ['bn', 'gu', 'kn', 'ml', 'mr', 'pa', 'ta', 'te'];
const enPath = path.join(process.cwd(), 'src/locales/en.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8').replace(/^\uFEFF/, '')).translation;

async function translateText(text, targetLang) {
  // Free google translate API endpoint
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    return json[0][0][0];
  } catch (e) {
    console.error(`Failed to translate "${text}" to ${targetLang}`, e);
    return text;
  }
}

async function run() {
  for (const lang of locales) {
    const locPath = path.join(process.cwd(), `src/locales/${lang}.json`);
    if (!fs.existsSync(locPath)) continue;
    
    let locFile = JSON.parse(fs.readFileSync(locPath, 'utf8').replace(/^\uFEFF/, ''));
    let locData = locFile.translation;
    let changed = false;

    console.log(`Translating missing keys for ${lang}...`);

    for (const key of Object.keys(enData)) {
      // If the language file has the exact same english string, it means it was a fallback and needs translation
      if (locData[key] === enData[key]) {
        // Some things shouldn't be translated or translate poorly like names, but for UI it's mostly fine
        const translated = await translateText(enData[key], lang);
        if (translated !== enData[key]) {
          locData[key] = translated;
          changed = true;
          console.log(`[${lang}] ${key}: ${enData[key]} -> ${translated}`);
        }
        // sleep a little to avoid rate limit
        await new Promise(r => setTimeout(r, 200));
      }
    }

    if (changed) {
      locFile.translation = locData;
      fs.writeFileSync(locPath, JSON.stringify(locFile, null, 2));
      console.log(`Saved ${lang}.json`);
    } else {
      console.log(`No changes needed for ${lang}.json`);
    }
  }
}

run();
