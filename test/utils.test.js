const { test } = require('node:test');
const assert = require('node:assert');

const Utils = require('../src/util/utils.js');

test('parseArgs splits on runs of spaces and ignores surrounding whitespace', () => {
    assert.deepStrictEqual(Utils.parseArgs('  a   b c '), ['a', 'b', 'c']);
    assert.deepStrictEqual(Utils.parseArgs('single'), ['single']);
});

test('getArgs without a limit returns every argument', () => {
    assert.deepStrictEqual(Utils.getArgs('a b c'), ['a', 'b', 'c']);
    assert.deepStrictEqual(Utils.getArgs('a b c', 0), ['a', 'b', 'c']);
    assert.deepStrictEqual(Utils.getArgs('a b c', NaN), ['a', 'b', 'c']);
});

test('getArgs keeps the rest of the text as the last argument when a limit is given', () => {
    assert.deepStrictEqual(Utils.getArgs('a b c d', 2), ['a', 'b c d']);
    assert.deepStrictEqual(Utils.getArgs('cmd  some   text here', 3), ['cmd', 'some', 'text here']);
});

test('getArgs with a limit larger than the argument count returns them all', () => {
    assert.deepStrictEqual(Utils.getArgs('a b', 5), ['a', 'b']);
});

test('decodeHtml turns HTML entities into characters', () => {
    assert.strictEqual(Utils.decodeHtml('Tom &amp; Jerry &lt;3 &quot;hi&quot;'), 'Tom & Jerry <3 "hi"');
    assert.strictEqual(Utils.decodeHtml('plain text'), 'plain text');
});

test('decodeHtml returns an empty string for non-strings', () => {
    assert.strictEqual(Utils.decodeHtml(undefined), '');
    assert.strictEqual(Utils.decodeHtml(null), '');
    assert.strictEqual(Utils.decodeHtml(42), '');
});

test('removeInvisibleCharacters strips zero-width and control characters', () => {
    assert.strictEqual(Utils.removeInvisibleCharacters('a\u200Bb\u200C\u200D\uFEFFc'), 'abc');
    assert.strictEqual(Utils.removeInvisibleCharacters('a\u0007b\u007Fc'), 'abc');
    assert.strictEqual(Utils.removeInvisibleCharacters('keep spaces'), 'keep spaces');
});

test('removeInvisibleCharacters returns an empty string for non-strings', () => {
    assert.strictEqual(Utils.removeInvisibleCharacters(undefined), '');
    assert.strictEqual(Utils.removeInvisibleCharacters({}), '');
});

test('escapeDiscordLinkText escapes link syntax and flattens newlines', () => {
    assert.strictEqual(Utils.escapeDiscordLinkText('[name](url)'), '\\[name\\]\\(url\\)');
    assert.strictEqual(Utils.escapeDiscordLinkText('a\\b'), 'a\\\\b');
    assert.strictEqual(Utils.escapeDiscordLinkText('line one\nline two\r\nline three'),
        'line one line two line three');
});

test('escapeDiscordLinkText returns an empty string for non-strings', () => {
    assert.strictEqual(Utils.escapeDiscordLinkText(undefined), '');
    assert.strictEqual(Utils.escapeDiscordLinkText(5), '');
});

test('findClosestString returns an exact match, ignoring case', () => {
    assert.strictEqual(Utils.findClosestString('abc', ['xyz', 'abc']), 'abc');
    assert.strictEqual(Utils.findClosestString('ABC', ['abc']), 'abc');
});

test('findClosestString picks the nearest string within the threshold', () => {
    assert.strictEqual(Utils.findClosestString('bandit', ['outpost', 'bandits', 'fishing']), 'bandits');
});

test('findClosestString returns null when nothing is close enough or the list is empty', () => {
    assert.strictEqual(Utils.findClosestString('zzzzzz', ['abc', 'defg']), null);
    assert.strictEqual(Utils.findClosestString('abc', []), null);
});

test('findClosestString honours a custom threshold', () => {
    assert.strictEqual(Utils.findClosestString('abcd', ['abxy'], 1), null);
    assert.strictEqual(Utils.findClosestString('abcd', ['abxy'], 2), 'abxy');
});
