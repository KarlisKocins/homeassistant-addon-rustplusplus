# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

Version 2.0.0 added authentication to the WebUI (session login on direct
access, Home Assistant ingress with HA's own authentication) and server-side
enforcement of the statistics PIN. Versions before 2.0.0 expose the WebUI
without authentication and should not be reachable from untrusted networks.

## Reporting a Vulnerability

Please do not open a public issue for security vulnerabilities. Instead, use
GitHub's private vulnerability reporting (the **Security** tab of this
repository → "Report a vulnerability"), or contact the maintainer directly.

You can expect an initial response within a few days. Confirmed issues will be
fixed in a patch release and credited in the changelog unless you prefer to
remain anonymous.
