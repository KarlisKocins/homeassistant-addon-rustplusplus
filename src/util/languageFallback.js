/* Falls back to English when a saved or configured language no longer has a translation file (for example
   after a language has been removed), so loading it never throws. Kept free of other requires on purpose. */

const Fs = require('fs');
const Path = require('path');

const LANGUAGES_DIR = Path.join(__dirname, '..', 'languages');
const FALLBACK_LANGUAGE = 'en';

function normalizeLanguage(language, languagesDir = LANGUAGES_DIR) {
    if (typeof language !== 'string' || !/^[A-Za-z0-9_-]{1,16}$/.test(language)) return FALLBACK_LANGUAGE;
    return Fs.existsSync(Path.join(languagesDir, `${language}.json`)) ? language : FALLBACK_LANGUAGE;
}

/* Fixes instance.generalSettings.language in place and returns the instance. */
function applyLanguageFallback(instance, languagesDir = LANGUAGES_DIR) {
    if (instance && instance.generalSettings) {
        instance.generalSettings.language = normalizeLanguage(instance.generalSettings.language, languagesDir);
    }
    return instance;
}

module.exports = { FALLBACK_LANGUAGE, normalizeLanguage, applyLanguageFallback };
