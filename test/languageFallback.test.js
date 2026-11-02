const test = require('node:test');
const assert = require('node:assert');
const Fs = require('node:fs');
const Os = require('node:os');
const Path = require('node:path');

const { normalizeLanguage, applyLanguageFallback } = require('../src/util/languageFallback.js');

const ROOT = Path.join(__dirname, '..');

test('a language that has a translation file is kept', () => {
    assert.strictEqual(normalizeLanguage('en'), 'en');
    assert.strictEqual(normalizeLanguage('de'), 'de');
});

test('a language without a translation file falls back to English', () => {
    assert.strictEqual(normalizeLanguage('ru'), 'en');
    assert.strictEqual(normalizeLanguage('xx'), 'en');
});

test('invalid language values fall back to English', () => {
    for (const value of [undefined, null, '', 42, {}, '../../package', 'en/../ru', 'e n']) {
        assert.strictEqual(normalizeLanguage(value), 'en', `value: ${JSON.stringify(value)}`);
    }
});

test('normalizeLanguage looks in the directory it is given', () => {
    const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'rpp-lang-'));
    try {
        Fs.writeFileSync(Path.join(dir, 'fr.json'), '{}');
        assert.strictEqual(normalizeLanguage('fr', dir), 'fr');
        assert.strictEqual(normalizeLanguage('de', dir), 'en');
    }
    finally {
        Fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('a saved instance with an unsupported language loads as English', () => {
    const instance = { generalSettings: { language: 'ru', prefix: '!' } };
    const result = applyLanguageFallback(instance);
    assert.strictEqual(result, instance);
    assert.strictEqual(instance.generalSettings.language, 'en');
    assert.strictEqual(instance.generalSettings.prefix, '!');
});

test('a saved instance with a supported language is left alone', () => {
    const instance = { generalSettings: { language: 'de' } };
    applyLanguageFallback(instance);
    assert.strictEqual(instance.generalSettings.language, 'de');
});

test('instances without general settings are returned unchanged', () => {
    assert.deepStrictEqual(applyLanguageFallback({}), {});
    assert.strictEqual(applyLanguageFallback(null), null);
});

test('Russian is no longer shipped', () => {
    assert.strictEqual(Fs.existsSync(Path.join(ROOT, 'src', 'languages', 'ru.json')), false);

    const actors = JSON.parse(Fs.readFileSync(Path.join(ROOT, 'src', 'staticFiles', 'actors.json'), 'utf8'));
    assert.strictEqual(Object.hasOwn(actors, 'ru'), false);

    const logos = Fs.readdirSync(Path.join(ROOT, 'src', 'resources', 'images', 'settings'));
    assert.deepStrictEqual(logos.filter(file => file.endsWith('_ru.png')), []);
});
