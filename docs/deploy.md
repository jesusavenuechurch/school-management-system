# Deploying

A plain Laravel 13 app. The server needs PHP 8.3+, Composer, Node 22+ (only
to build the front end) and MySQL 8 (or MariaDB 10.6+).

## First time

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

Point the web server's document root at `public/`. The web server user must
be able to write to `storage/` and `bootstrap/cache/`.

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
