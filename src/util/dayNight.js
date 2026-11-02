/* Day/night helpers for Smart Switch auto modes, with a per-switch offset.
   All times are in-game hours (0-24). An offset moves both the sunrise and the sunset boundary:
   negative is earlier, positive is later. */

const MAX_OFFSET_MINUTES = 120;

function wrapHours(hours) {
    return ((hours % 24) + 24) % 24;
}

/* Real-time minutes, clamped to +-MAX_OFFSET_MINUTES. Anything that is not a number becomes 0. */
function clampOffsetMinutes(value) {
    const minutes = Math.round(Number(value));
    if (!Number.isFinite(minutes)) return 0;
    return Math.max(-MAX_OFFSET_MINUTES, Math.min(MAX_OFFSET_MINUTES, minutes));
}

/* Convert a real-time offset in minutes to in-game hours, using the server's day length in real minutes. */
function offsetMinutesToGameHours(offsetMinutes, dayLengthMinutes) {
    if (!(dayLengthMinutes > 0)) return 0;
    return (offsetMinutes / dayLengthMinutes) * 24;
}

function isDayAt(time, sunrise, sunset, offsetHours = 0) {
    /* A window that covers the whole 24 hours (sunrise 0, sunset 24) would otherwise wrap to an empty one. */
    if (sunset - sunrise >= 24) return true;

    /* Moving the boundaries by +offset is the same as moving the clock by -offset. */
    const t = wrapHours(time - offsetHours);
    const rise = wrapHours(sunrise);
    const set = wrapHours(sunset);
    return rise <= set ? (t >= rise && t < set) : (t >= rise || t < set);
}

/* prev and next are { time, sunrise, sunset }: the clock before and after the latest poll. */
function turnedDay(prev, next, offsetHours = 0) {
    return !isDayAt(prev.time, prev.sunrise, prev.sunset, offsetHours) &&
        isDayAt(next.time, next.sunrise, next.sunset, offsetHours);
}

function turnedNight(prev, next, offsetHours = 0) {
    return isDayAt(prev.time, prev.sunrise, prev.sunset, offsetHours) &&
        !isDayAt(next.time, next.sunrise, next.sunset, offsetHours);
}

module.exports = {
    MAX_OFFSET_MINUTES,
    clampOffsetMinutes,
    offsetMinutesToGameHours,
    isDayAt,
    turnedDay,
    turnedNight
};
