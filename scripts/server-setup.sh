#!/usr/bin/env bash
#
# One-shot setup for a TEST server: makes this app the only site nginx
# serves, creates the database and its user from .env, fixes file
# permissions and builds the app.
#
#   sudo bash scripts/server-setup.sh school.example.com
#
# (Use the server's IP address instead of a domain if you have none yet.)
#
# What it changes outside this folder:
#   - every other nginx site is switched off (configs are copied to
#     /etc/nginx/disabled-sites-<date> first; their files and databases
#     are left alone)
#   - the MySQL database and user named in .env are created, and the
#     user's password is set to the one in .env
#   - PHP's upload limit is raised to 10 MB
#
# This is for the first install. To update the app later, use
# scripts/deploy.sh, which leaves nginx and HTTPS alone.

set -euo pipefail

DOMAIN="${1:-}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER="${SUDO_USER:-}"

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mStopped: %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fail "run it with sudo: sudo bash scripts/server-setup.sh your-domain"
[[ -n "$APP_USER" && "$APP_USER" != "root" ]] || fail "run it with sudo from your normal user, not as root"
[[ -n "$DOMAIN" ]] || fail "give the domain or IP: sudo bash scripts/server-setup.sh school.example.com"
[[ -f "$APP_DIR/artisan" ]] || fail "can't find the app in $APP_DIR"

as_app() { sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' && $*"; }

# ---------------------------------------------------------------------------
say "Checking the server"

command -v nginx >/dev/null || fail "nginx is not installed (sudo apt install nginx)"
command -v mysql >/dev/null || fail "MySQL/MariaDB is not installed (sudo apt install mysql-server)"
command -v php >/dev/null || fail "PHP is not installed"
command -v composer >/dev/null || fail "Composer is not installed"
command -v npm >/dev/null || fail "Node.js/npm is not installed"

php -r 'exit(version_compare(PHP_VERSION, "8.3.0", ">=") ? 0 : 1);' \
    || fail "PHP 8.3 or newer is needed; this server has $(php -r 'echo PHP_VERSION;')"

PHP_V="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"
FPM_SOCK="/run/php/php${PHP_V}-fpm.sock"
[[ -S "$FPM_SOCK" ]] || fail "php${PHP_V}-fpm is not running (sudo apt install php${PHP_V}-fpm)"

for ext in mysql mbstring xml curl zip gd bcmath intl; do
    php -m | grep -qi "^${ext/mysql/pdo_mysql}$" || MISSING_EXT+=" php${PHP_V}-${ext}"
done
if [[ -n "${MISSING_EXT:-}" ]]; then
    say "Installing missing PHP extensions:${MISSING_EXT}"
    apt-get update -qq && apt-get install -y -qq $MISSING_EXT
    systemctl restart "php${PHP_V}-fpm"
fi

command -v setfacl >/dev/null || { apt-get update -qq && apt-get install -y -qq acl; }

# ---------------------------------------------------------------------------
say "Reading .env"

if [[ ! -f "$APP_DIR/.env" ]]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
    echo "Created .env from .env.example"
fi

env_get() { grep -E "^$1=" "$APP_DIR/.env" | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"; }
env_set() {
    if grep -qE "^$1=" "$APP_DIR/.env"; then
        sed -i "s|^$1=.*|$1=$2|" "$APP_DIR/.env"
    else
        echo "$1=$2" >> "$APP_DIR/.env"
    fi
}

# Running this again with a different address would replace the HTTPS
# site with a plain HTTP one. Updates go through deploy.sh instead.
OLD_URL="$(env_get APP_URL || true)"
OLD_HOST="${OLD_URL#*://}"
OLD_HOST="${OLD_HOST%%/*}"
if [[ "$OLD_URL" == https://* && "$OLD_HOST" != "$DOMAIN" && "${FORCE:-}" != 1 ]]; then
    fail "this server already runs on $OLD_URL.
  To update the app:         bash scripts/deploy.sh
  To redo setup, same site:  sudo bash scripts/server-setup.sh $OLD_HOST
  To really switch address:  sudo FORCE=1 bash scripts/server-setup.sh $DOMAIN"
fi

env_set APP_ENV production
# The platform's name, unless this server was given its own.
case "$(env_get APP_NAME)" in
    ""|Laravel|"School Management System") env_set APP_NAME Leseli ;;
esac
env_set APP_DEBUG false
env_set INERTIA_SSR_ENABLED false
env_set DB_CONNECTION mysql
env_set DB_HOST 127.0.0.1
env_set DB_PORT 3306
env_set APP_URL "http://$DOMAIN"

DB_NAME="$(env_get DB_DATABASE)"
DB_USER="$(env_get DB_USERNAME)"
DB_PASS="$(env_get DB_PASSWORD)"

[[ -n "$DB_NAME" && "$DB_NAME" != *"/"* && "$DB_NAME" != *".sqlite" ]] || { DB_NAME=leseli; env_set DB_DATABASE "$DB_NAME"; }
[[ -n "$DB_USER" && "$DB_USER" != "root" ]] || { DB_USER=leseli; env_set DB_USERNAME "$DB_USER"; }
if [[ -z "$DB_PASS" ]]; then
    DB_PASS="$(openssl rand -hex 16)"
    env_set DB_PASSWORD "$DB_PASS"
    echo "Generated a database password and saved it in .env"
fi

[[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]] || fail "DB_DATABASE may only contain letters, numbers and _"
[[ "$DB_USER" =~ ^[A-Za-z0-9_]+$ ]] || fail "DB_USERNAME may only contain letters, numbers and _"
# Escape for a MySQL string: double backslashes, double single quotes.
DB_PASS_SQL="$(printf '%s' "$DB_PASS" | sed -e 's/\\/\\\\/g' -e "s/'/''/g")"

# ---------------------------------------------------------------------------
say "Database '$DB_NAME' and user '$DB_USER'"

mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS_SQL';
CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS_SQL';
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS_SQL';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS_SQL';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

# ---------------------------------------------------------------------------
say "File permissions (owner $APP_USER, web group www-data)"

chown -R "$APP_USER:www-data" "$APP_DIR"
find "$APP_DIR" -path "$APP_DIR/node_modules" -prune -o -path "$APP_DIR/vendor" -prune -o -path "$APP_DIR/.git" -prune -o -type d -exec chmod 755 {} +
chmod 640 "$APP_DIR/.env"
mkdir -p "$APP_DIR/storage/logs" "$APP_DIR/bootstrap/cache"
setfacl -R -m "u:$APP_USER:rwX" -m g:www-data:rwX "$APP_DIR/storage" "$APP_DIR/bootstrap/cache"
setfacl -dR -m "u:$APP_USER:rwX" -m g:www-data:rwX "$APP_DIR/storage" "$APP_DIR/bootstrap/cache"

# nginx needs to walk down to public/ (e.g. when the app is under /home).
parent="$APP_DIR"
while [[ "$parent" != "/" ]]; do
    chmod o+x "$parent" 2>/dev/null || true
    parent="$(dirname "$parent")"
done

# ---------------------------------------------------------------------------
say "Building the app"

as_app "composer install --no-dev --optimize-autoloader --no-interaction"
if [[ -z "$(env_get APP_KEY)" ]]; then
    as_app "php artisan key:generate --force"
fi
# Not optimize:clear: on a fresh database the cache table does not exist yet.
# Clear the route cache too: the build's Wayfinder step reads the routes, and
# a cache left from the last deploy hides any routes added since.
as_app "php artisan config:clear"
as_app "php artisan route:clear"
as_app "php artisan migrate --force"
as_app "php artisan storage:link" || true
as_app "npm ci --no-audit --no-fund"
as_app "npm run build"
as_app "php artisan optimize"

# ---------------------------------------------------------------------------
say "nginx: this app becomes the only site"

BACKUP="/etc/nginx/disabled-sites-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
cp -a /etc/nginx/sites-available/. "$BACKUP/" 2>/dev/null || true
cp -a /etc/nginx/conf.d/. "$BACKUP/conf.d/" 2>/dev/null || true
find /etc/nginx/sites-enabled -mindepth 1 -delete
find /etc/nginx/conf.d -maxdepth 1 -name '*.conf' -delete 2>/dev/null || true
echo "Old site configs copied to $BACKUP"

cat > /etc/nginx/sites-available/school-management-system <<NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN;
    root $APP_DIR/public;
    index index.php;

    charset utf-8;
    client_max_body_size 10M;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    location ~ ^/index\.php(/|\$) {
        fastcgi_pass unix:$FPM_SOCK;
        fastcgi_split_path_info ^(.+\.php)(/.*)\$;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT \$realpath_root;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/school-management-system /etc/nginx/sites-enabled/school-management-system
nginx -t
systemctl reload nginx

# ---------------------------------------------------------------------------
say "PHP upload limits"

FPM_INI="/etc/php/$PHP_V/fpm/php.ini"
if [[ -f "$FPM_INI" ]]; then
    sed -i -E 's/^;?upload_max_filesize.*/upload_max_filesize = 10M/; s/^;?post_max_size.*/post_max_size = 12M/' "$FPM_INI"
    systemctl restart "php${PHP_V}-fpm"
fi

# ---------------------------------------------------------------------------
if [[ ! "$DOMAIN" =~ ^[0-9.]+$ ]] && command -v certbot >/dev/null; then
    say "HTTPS"
    if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect; then
        env_set APP_URL "https://$DOMAIN"
        as_app "php artisan config:cache"
    else
        echo "certbot failed; the site still works on http://$DOMAIN"
    fi
fi

say "Done. Open $(env_get APP_URL)"
