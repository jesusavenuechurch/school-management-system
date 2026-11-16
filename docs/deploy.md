# Deploying

A plain Laravel 13 app. The server needs PHP 8.3+, Composer, Node 22+ (only
to build the front end) and MySQL 8 (or MariaDB 10.6+).

## Quick setup on a test server

`scripts/server-setup.sh` does everything below in one go: database and user
from `.env`, permissions, build, and an nginx site that becomes **the only
site** on the server (other site configs are backed up and switched off).

```bash
sudo bash scripts/server-setup.sh school.example.com
```

## First time, by hand

```bash
git clone <repo-url> school-management-system
cd school-management-system
cp .env.example .env
```

Edit `.env`:

| Key                   | Value                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`             | `production`                                                                                                                           |
| `APP_DEBUG`           | `false`                                                                                                                                |
| `APP_URL`             | The real address, e.g. `https://school.example.com`. **The QR codes on student ID cards point here**, so set it before printing cards. |
| `DB_CONNECTION`       | `mysql`, plus `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`                                                                   |
| `INERTIA_SSR_ENABLED` | `false`                                                                                                                                |
| `WHATSAPP_*`          | Leave empty until the Meta templates in `docs/whatsapp.md` are approved. Admins can still send invitations from their own WhatsApp.    |

Then:

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan storage:link
npm ci
npm run build
php artisan optimize
```

`npm run build` also generates the typed route helpers, so it needs PHP on
the same machine.

## File permissions

Your SSH user owns the files (so `git pull` and `composer` work without
sudo); the web server's group (`www-data`) can read them and write to
`storage/` and `bootstrap/cache/`. Run from the project folder:

```bash
sudo chown -R $USER:www-data .
sudo find . -path ./node_modules -prune -o -path ./vendor -prune -o -type d -exec chmod 755 {} +
sudo chmod 640 .env
sudo apt-get install -y acl
sudo setfacl -R -m u:$USER:rwX -m g:www-data:rwX storage bootstrap/cache
sudo setfacl -dR -m u:$USER:rwX -m g:www-data:rwX storage bootstrap/cache
```

The last two lines also apply to files created later, so a log file made by
`php artisan` stays writable by the website and the other way round.
Run `php artisan` as your own user, never with `sudo`.

## Nginx

`/etc/nginx/sites-available/school-management-system`, linked into
`sites-enabled`. Check the PHP socket name with `ls /run/php/`.

```nginx
server {
    listen 80;
    server_name school.example.com;
    root /var/www/school-management-system/public;
    index index.php;

    charset utf-8;
    client_max_body_size 10M;   # learner photos and staff spreadsheets

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    location ~ ^/index\.php(/|$) {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_split_path_info ^(.+\.php)(/.*)$;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $realpath_root;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/school-management-system /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d school.example.com
```

Also raise PHP's own upload limit to match, in
`/etc/php/8.3/fpm/php.ini`: `upload_max_filesize = 10M` and
`post_max_size = 12M`, then `sudo systemctl restart php8.3-fpm`.

## Updating

```bash
git pull
composer install --no-dev --optimize-autoloader
php artisan migrate --force
npm ci && npm run build
php artisan optimize
```

## Things to know

- **Learner photos** are stored in `storage/app/private`, never in `public/`.
  Back that folder up along with the database.
- **School logos** are in `storage/app/public` and served through the
  `storage:link` symlink.
- **Sessions, cache and queue** use the database by default, so nothing else
  needs to run. There are no scheduled tasks yet.
- **HTTPS** matters: teachers sign in on phones over school and mobile
  networks.
