# Maintaining the add-on

Notes for maintainers and contributors. User documentation lives in [DOCS.md](../DOCS.md).

## Repository layout

```text
.github/workflows/   CI: tests, lint, startup smoke test, image builder, release
config.yaml          Add-on manifest (options, schema, ingress, watchdog)
translations/        Friendly option names and descriptions for the HA config UI
Dockerfile           Multi-stage image build
run.sh               Maps Home Assistant options to environment variables
repository.yaml      Add-on repository metadata
index.js, config/    Entry point and runtime configuration helpers
src/                 Bot source (commands, Discord events, handlers, MQTT bridge)
public/              WebUI frontend (native ES modules, no build step)
scripts/             Smoke test and tooling
test/                node --test suite
vendor/              Vendored rustplus.js tarball (see below)
docs/                Guides
```

## Releasing a new version

1. Update source files and dependency lockfiles as needed.
2. Bump the version in `package.json`, `package-lock.json` and `config.yaml`, and add an entry to `CHANGELOG.md`.
3. Keep documentation and `translations/en.yaml` aligned with the `options` and `schema` in `config.yaml`.
4. Run `npm run lint` and the unit tests: `npm test` (covers WebUI auth, BattleMetrics key handling, HA availability and statistics SQL).
5. Run the startup smoke test (below).
6. Merge to `main`, then push a `vX.Y.Z` tag. The `Release` workflow checks the tag against the `config.yaml` version and publishes the GitHub release using the matching `CHANGELOG.md` section as notes (the heading must look like `## vX.Y.Z (date)`).

## Startup smoke test

Emulates Home Assistant add-on runtime expectations (`/data/options.json`, a mock Supervisor API and the `run.sh` boot path):

```bash
chmod +x scripts/ha_addon_smoke_test.sh
./scripts/ha_addon_smoke_test.sh
```

It validates that the image builds, that startup reaches `run.sh -> node index.js`, and that the required configuration is retrievable via the Supervisor API contract. CI runs it on every PR and push through `.github/workflows/addon-startup-smoke.yml`.

For end-to-end testing against a real Supervisor, use Home Assistant's [local add-on testing environment](https://developers.home-assistant.io/docs/add-ons/testing).

## Vendored `rustplus.js`

`@liamcottle/rustplus.js` is installed from `vendor/rustplus.js-089cfd3d.tgz` (the suffix is the commit of the `alexemanuelol/rustplus.js` fork it was packed from; it carries the protobuf schema the Rust+ server expects, which fixed a `queuedPlayers` ProtocolError) rather than from npm. It is excluded from Dependabot and updated by hand: pack the new upstream commit, replace the tarball, update the `file:` path in `package.json` and `Dockerfile`, then refresh `package-lock.json`.

## Supported architectures

`aarch64` and `amd64`, built from the Home Assistant base image family declared in the `Dockerfile`.

## Security

- Never commit Discord tokens, MQTT passwords or Rust+ credentials.
- Sensitive options use the `password` schema type so Home Assistant stores them as secrets.
- Report vulnerabilities as described in [SECURITY.md](../SECURITY.md).
