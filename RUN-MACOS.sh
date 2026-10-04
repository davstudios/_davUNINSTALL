#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
command -v node >/dev/null
command -v npm >/dev/null
command -v cargo >/dev/null
npm install --no-audit --no-fund
npm run desktop


