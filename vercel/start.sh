#!/bin/sh
set -eu

port="${PORT:-80}"
case "$port" in
  ''|*[!0-9]*) echo "PORT must be a numeric TCP port." >&2; exit 1 ;;
esac
sed -i "s/^Listen 80$/Listen ${port}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${port}>/" /etc/apache2/sites-available/000-default.conf

# Keep recovery email delivery on localhost inside the same Vercel container.
if [ -n "${CSM_MAILER_SECRET:-}" ]; then
  node /var/www/html/mailer/server.js &
fi

exec apache2-foreground
