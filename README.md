# Tulkit

[![Netlify Status](https://api.netlify.com/api/v1/badges/a7a6bfd2-f047-4bb5-83fb-feac5383bda7/deploy-status)](https://app.netlify.com/projects/thetulkit/deploys)

Solving your tiny, annoying problems so you can get back to the big ones.

**Visit**: <https://tulkit.widnyana.web.id/>

## Available Tools

- .env Comparator
- NetPlan (IP Planner)
- IP Calculator
- Random String Generator
- Invoice Generator

## Development

A pre-commit hook scans staged changes for secrets with [gitleaks](https://github.com/gitleaks/gitleaks). It auto-activates on `pnpm install` via `core.hooksPath`. Install gitleaks once: `mise use -g gitleaks@latest`.
