const test = require('node:test');
const assert = require('node:assert');

const {
    clampOffsetMinutes,
    offsetMinutesToGameHours,
    isDayAt,
    turnedDay,
    turnedNight
} = require('../src/util/dayNight.js');

/* Typical Rust values: sunrise 7.5, sunset 19.5, 45 real minute day. */
const SUNRISE = 7.5;
const SUNSET = 19.5;
const at = (time, sunrise = SUNRISE, sunset = SUNSET) => ({ time, sunrise, sunset });

test('clampOffsetMinutes keeps values in range and falls back to 0', () => {
    assert.strictEqual(clampOffsetMinutes(15), 15);
    assert.strictEqual(clampOffsetMinutes('-10'), -10);
    assert.strictEqual(clampOffsetMinutes(9999), 120);
    assert.strictEqual(clampOffsetMinutes(-9999), -120);
    assert.strictEqual(clampOffsetMinutes('abc'), 0);
    assert.strictEqual(clampOffsetMinutes(undefined), 0);
    assert.strictEqual(clampOffsetMinutes(null), 0);
    assert.strictEqual(clampOffsetMinutes(2.7), 3);
});

test('offsetMinutesToGameHours scales by the server day length', () => {
    assert.strictEqual(offsetMinutesToGameHours(0, 45), 0);
    assert.strictEqual(offsetMinutesToGameHours(45, 45), 24);
    assert.strictEqual(offsetMinutesToGameHours(-15, 60), -6);
});

test('offsetMinutesToGameHours returns 0 without a valid day length', () => {
    assert.strictEqual(offsetMinutesToGameHours(10, 0), 0);
    assert.strictEqual(offsetMinutesToGameHours(10, undefined), 0);
    assert.strictEqual(offsetMinutesToGameHours(10, -5), 0);
});

test('isDayAt with no offset matches the plain sunrise/sunset window', () => {
    assert.strictEqual(isDayAt(12, SUNRISE, SUNSET, 0), true);
    assert.strictEqual(isDayAt(SUNRISE, SUNRISE, SUNSET, 0), true);
    assert.strictEqual(isDayAt(SUNSET, SUNRISE, SUNSET, 0), false);
    assert.strictEqual(isDayAt(3, SUNRISE, SUNSET, 0), false);
});

test('a full-day window (sunrise 0, sunset 24) is always day', () => {
    assert.strictEqual(isDayAt(0, 0, 24, 0), true);
    assert.strictEqual(isDayAt(12, 0, 24, 0), true);
    assert.strictEqual(isDayAt(23.9, 0, 24, 0), true);
    assert.strictEqual(isDayAt(12, 0, 24, 5), true);
});

test('a negative offset moves both boundaries earlier', () => {
    /* -1 hour: day is 6.5 .. 18.5 */
    assert.strictEqual(isDayAt(18.6, SUNRISE, SUNSET, -1), false);
    assert.strictEqual(isDayAt(18.4, SUNRISE, SUNSET, -1), true);
    assert.strictEqual(isDayAt(6.6, SUNRISE, SUNSET, -1), true);
    assert.strictEqual(isDayAt(6.4, SUNRISE, SUNSET, -1), false);
});

test('a positive offset moves both boundaries later', () => {
    /* +1 hour: day is 8.5 .. 20.5 */
    assert.strictEqual(isDayAt(8.0, SUNRISE, SUNSET, 1), false);
    assert.strictEqual(isDayAt(8.6, SUNRISE, SUNSET, 1), true);
    assert.strictEqual(isDayAt(20.0, SUNRISE, SUNSET, 1), true);
    assert.strictEqual(isDayAt(20.6, SUNRISE, SUNSET, 1), false);
});

test('isDayAt handles a window that wraps past midnight', () => {
    /* +6 hours: day is 13.5 .. 25.5, i.e. 13.5 .. 24 and 0 .. 1.5 */
    assert.strictEqual(isDayAt(23, SUNRISE, SUNSET, 6), true);
    assert.strictEqual(isDayAt(1, SUNRISE, SUNSET, 6), true);
    assert.strictEqual(isDayAt(2, SUNRISE, SUNSET, 6), false);
    assert.strictEqual(isDayAt(13, SUNRISE, SUNSET, 6), false);
});

test('turnedNight fires once when time crosses the shifted sunset', () => {
    /* offset -1 hour: switches at 18.5 instead of 19.5 */
    assert.strictEqual(turnedNight(at(18.4), at(18.6), -1), true);
    assert.strictEqual(turnedNight(at(18.6), at(18.7), -1), false);
    assert.strictEqual(turnedNight(at(19.4), at(19.6), 0), true);
});

test('turnedDay fires once when time crosses the shifted sunrise', () => {
    /* offset +1 hour: switches at 8.5 instead of 7.5 */
    assert.strictEqual(turnedDay(at(8.4), at(8.6), 1), true);
    assert.strictEqual(turnedDay(at(7.4), at(7.6), 1), false);
    assert.strictEqual(turnedDay(at(7.4), at(7.6), 0), true);
});

test('transitions are detected across the midnight wrap', () => {
    /* The in-game clock wraps 23.9 -> 0.1 with a wrapped day window. */
    assert.strictEqual(turnedNight(at(1.4), at(1.6), 6), true);
    assert.strictEqual(turnedDay(at(13.4), at(13.6), 6), true);
    assert.strictEqual(turnedNight(at(23.9), at(0.1), 6), false);
});

test('no transition when the time does not change', () => {
    assert.strictEqual(turnedDay(at(12), at(12), 0), false);
    assert.strictEqual(turnedNight(at(12), at(12), 0), false);
});

test('a changed sunset between polls is honoured, as before the offset existed', () => {
    /* Old window 7.5 .. 19.5, new window 7.5 .. 12: at 13 it just became night. */
    assert.strictEqual(turnedNight(at(13, 7.5, 19.5), at(13, 7.5, 12), 0), true);
});
