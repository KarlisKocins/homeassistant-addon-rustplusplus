# rustplusplus (Home Assistant add-on)

Discord bot that uses the Rust+ Companion App API (`rustplus.js`). This repo is a Home Assistant add-on fork of alexemanuelol/rustplusplus.

## Commands
- Start: `npm start` (runs `node index.js`)
- Test: `npm test` (runs `node --test`)
- Lint: `npm run lint` (ESLint, flat config in `eslint.config.js`)
- There is no build step.

## Notes
- Node >= 22, JavaScript only (no TypeScript).
- `@liamcottle/rustplus.js` is vendored from `vendor/rustplus.js-089cfd3d.tgz`.
- Add-on packaging: `config.yaml`, `Dockerfile`, `run.sh`, `repository.yaml`.
- `credentials/`, `instances/` and `logs/` hold runtime data. Never commit secrets from them.
- Commits are attributed to the author only: no Co-Authored-By or "Generated with" lines.
