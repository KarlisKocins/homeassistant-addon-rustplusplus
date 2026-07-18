# RustPlusPlus Home Assistant Add-on Deployment Guide

This guide explains how to deploy the RustPlusPlus Home Assistant add-on to your own GitHub repository and make it available for installation.

## Overview

The add-on has the following structure:

```text
homeassistant-addon-rustplusplus/
|-- .github/workflows/builder.yaml    # Automated building
|-- .gitignore                        # Git ignore rules
|-- build.yaml                        # Build configuration
|-- config.yaml                       # Add-on configuration
|-- Dockerfile                        # Container definition
|-- README.md                         # Add-on documentation
|-- INSTALLATION_GUIDE.md             # User installation guide
|-- DEPLOYMENT_GUIDE.md               # This file
|-- SUMMARY.md                        # Project summary
|-- repository.yaml                   # Repository metadata
|-- run.sh                            # Startup script
|-- package.json                      # Node.js dependencies
|-- package-lock.json                 # Dependency lock file
|-- index.js                          # Main application file
|-- config/                           # Runtime configuration helpers
|-- public/                           # WebUI frontend (native ES modules)
|-- scripts/                          # Smoke test and tooling
|-- test/                             # node --test suite (npm test)
|-- src/                              # Bot source code
`-- [other RustPlusPlus files]
```

## Step 1: Create GitHub Repository

1. Create a new repository on GitHub (public for Home Assistant add-on repositories).
2. Upload all add-on files and keep directory structure intact.
3. Update repository metadata and links in docs (`repository.yaml`, `README.md`, issue links).

## Step 2: Configure GitHub Actions

1. Enable GitHub Actions in your repository.
2. Confirm your workflow can push images to GitHub Container Registry (`ghcr.io`).

## Step 3: Test the Build

1. Push an initial commit.
2. Verify workflow builds pass for all configured architectures.
3. Fix build errors before publishing.

## Step 4: Make Repository Available

1. Create a release (optional but recommended), for example `v2.0.0`.
2. Verify installation docs use the correct repository URL.

## Step 5: Distribution

### Option A: Direct Repository Addition
Users can add your repository in Home Assistant:
1. Settings -> Add-ons -> Add-on Store -> menu -> Repositories
2. Add: `https://github.com/YOUR_USERNAME/homeassistant-addon-rustplusplus`

### Option B: Community Add-ons
For wider distribution, consider submitting to community add-on repositories and follow their contribution guidelines.

## Maintenance

### Updating RustPlusPlus Version
When RustPlusPlus releases updates:

1. Update source files and dependency lockfiles as needed.
2. Update version fields in `package.json`, `package-lock.json`, `config.yaml`, and `build.yaml`.
3. Keep documentation aligned with:
   - `config.yaml` `options` and `schema`
   - user-facing switch automation modes (for example `AUTO-NIGHT-ANY-ONLINE`)
4. Run the unit tests: `npm test` (node --test; covers WebUI auth and statistics SQL).
5. Run/verify builds and create a release tag.

### Local Startup Smoke Test

Before publishing a release, run a local container startup smoke test that emulates Home Assistant add-on runtime expectations (`/data/options.json` + mock Supervisor API + `run.sh` boot path):

```bash
chmod +x scripts/ha_addon_smoke_test.sh
./scripts/ha_addon_smoke_test.sh
```

What it validates:
- The add-on image builds successfully.
- Startup reaches `run.sh -> node index.js` launch output.
- Required add-on config is retrievable via the Supervisor API contract.

CI also runs this smoke test on every PR and push via `.github/workflows/addon-startup-smoke.yml`.

### Full Home Assistant Emulation (Optional)

For end-to-end add-on testing (Supervisor/UI) use Home Assistant's local add-on testing environment:

- https://developers.home-assistant.io/docs/add-ons/testing

This is heavier than the smoke test, but closest to production behavior.

### Key Dependencies
- Node.js 22+ runtime
- `mqtt` for Home Assistant device discovery
- `discord.js` for Discord bot functionality
- `@liamcottle/rustplus.js` for Rust+ companion API access

### Supported Architectures
Current add-on build targets are `aarch64` and `amd64`.

### Monitoring
- Watch upstream RustPlusPlus changes.
- Monitor issue reports.
- Keep dependencies updated for security.

## Troubleshooting

### Build Failures
- Review GitHub Actions logs.
- Verify required files exist.
- Validate Dockerfile/build configuration syntax.

### Installation Issues
- Run through installation steps in a clean Home Assistant instance if possible.
- Verify repository URL accessibility.

### Runtime Problems
- Check add-on logs in Home Assistant.
- Validate add-on configuration values.
- Test with minimal config first (Discord only), then add MQTT/WebUI.

## Security Considerations

1. Never commit Discord tokens or credentials.
2. Use Home Assistant config/secrets handling for sensitive data.
3. Keep base images and dependencies up to date.

## Support

1. Check upstream RustPlusPlus documentation.
2. Review Home Assistant add-on developer docs.
3. Use your repository issues for add-on specific problems.

## License

This add-on is based on RustPlusPlus by alexemanuelol (GPL-3.0). Follow GPL requirements when distributing.
