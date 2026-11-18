#!/usr/bin/env bash
#
# Update a server that is already set up: pulls the latest code, installs
# packages, migrates the database and rebuilds. It does not touch nginx,
# HTTPS, the database user or .env.
#
#   bash scripts/deploy.sh
#
# (For the first install use scripts/server-setup.sh instead.)

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mStopped: %s\033[0m\n' "$*" >&2; exit 1; }

# Run as the normal user so new files keep the right owner.
if [[ $EUID -eq 0 ]]; then
    [[ -n "${SUDO_USER:-}" && "$SUDO_USER" != "root" ]] || fail "run it as your normal user: bash scripts/deploy.sh"
    exec sudo -u "$SUDO_USER" -H bash "$0" "$@"
fi

[[ -f .env ]] || fail "no .env here; run scripts/server-setup.sh first"

say "Getting the latest code"
git pull --ff-only

say "Maintenance mode on"
php artisan down --retry=15 || true
# Whatever happens below, bring the site back up.
trap 'php artisan up >/dev/null 2>&1 || true' EXIT

say "PHP packages"
composer install --no-dev --optimize-autoloader --no-interaction

say "Database"
# The build reads the routes, so clear the cached ones first.
php artisan config:clear
php artisan route:clear
php artisan migrate --force

say "Frontend"
npm ci --no-audit --no-fund
npm run build

say "Caches"
php artisan optimize

php artisan up
trap - EXIT

say "Done. $(grep -E '^APP_URL=' .env | cut -d= -f2-) is up to date."
