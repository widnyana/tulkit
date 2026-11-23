# Security Policy

## Supported Versions

Tulkit is a continuously deployed web app. The version in the footer identifies the build
that runs at https://tulkit.widnyana.web.id, and every release is tagged in this
repository.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

Only the latest release receives security fixes. Older tags stay in history and are not
patched.

## Reporting a Vulnerability

Report privately through GitHub's advisory flow:

https://github.com/widnyana/tulkit/security/advisories/new

Do not open a public issue, pull request, or discussion for a vulnerability.

Please include the affected URL or tool, the input you sent, what happened, the impact you
expect, and a minimal reproduction if you have one. A short proof beats a scanner report.

What to expect:

- acknowledgement within 7 days
- an assessment within 14 days: accepted, need more information, or out of scope
- if accepted, a fix ships through the normal release flow and the advisory is published
  once that release is live
- if declined, the reason, plus credit in the advisory unless you ask to stay unnamed
- status updates when the assessment or the fix moves, not on a fixed schedule

## Scope

In scope:

- the deployed site and the client code in this repository
- the API proxies under `app/api`: `fetch-schema`, the GPX `routing`, `snap` and
  `elevation` routes, and `resolve-maps-link`

Out of scope:

- vulnerabilities in third-party services these tools call, including OSRM routing,
  Nominatim, Open-Meteo, Google Maps, and tile or CDN providers
- reports that require a compromised browser, extension, or local machine
- findings that only affect the development server

There is no bug bounty. Fixes are credited in the advisory.
