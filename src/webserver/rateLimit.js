/*
    Copyright (C) 2026 Alexander Emanuelsson (alexemanuelol)

    Small in-memory rate limiter for WebUI endpoints.
    Entries are swept periodically so the map cannot grow unbounded.
*/

function createRateLimitMiddleware(maxRequests, windowMs, message) {
    const attempts = new Map();

    /* Sweep expired entries so distinct guildId:ip keys do not accumulate forever */
    const sweeper = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of attempts) {
            if (entry.resetAt <= now) attempts.delete(key);
        }
    }, windowMs);
    sweeper.unref();

    return (req, res, next) => {
        const guildId = req.params.guildId || 'global';
        const ip = req.ip || req.socket?.remoteAddress || 'unknown';
        const key = `${guildId}:${ip}`;
        const now = Date.now();

        let entry = attempts.get(key);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
        }

        entry.count += 1;
        attempts.set(key, entry);

        if (entry.count > maxRequests) {
            const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
            res.set('Retry-After', `${retryAfterSeconds}`);
            return res.status(429).json({ success: false, error: message });
        }

        next();
    };
}

module.exports = { createRateLimitMiddleware };
