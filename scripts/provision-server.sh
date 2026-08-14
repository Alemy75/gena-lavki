#!/usr/bin/env bash
# Готовит чистый VPS (Debian/Ubuntu) к запуску стека: Docker, /opt/gena-lavki,
# заготовка .env со сгенерированными секретами, ключ для деплоя из GitHub Actions.
#
# Запуск НА сервере от root:
#   DOMAIN=lavki76.ru bash provision-server.sh
# С ключом деплоя (публичная часть DEPLOY_SSH_KEY):
#   DOMAIN=lavki76.ru DEPLOY_PUBKEY="ssh-ed25519 AAAA... deploy" bash provision-server.sh
#
# Идемпотентен: повторный запуск не перетирает существующий .env и не переустанавливает Docker.
set -euo pipefail

DOMAIN="${DOMAIN:?укажи DOMAIN, например DOMAIN=lavki76.ru}"
WORKDIR="${WORKDIR:-/opt/gena-lavki}"
DEPLOY_PUBKEY="${DEPLOY_PUBKEY:-}"

[ "$(id -u)" = 0 ] || { echo "нужен root" >&2; exit 1; }
command -v apt-get >/dev/null || { echo "скрипт рассчитан на Debian/Ubuntu" >&2; exit 1; }

# 1) Docker + compose-плагин. Официальный установщик сам добавляет репозиторий
#    и ставит docker-compose-plugin; на уже настроенной машине пропускаем.
if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  echo "Docker уже установлен: $(docker --version)"
else
  echo "Ставлю Docker..."
  apt-get update -y
  apt-get install -y --no-install-recommends ca-certificates curl
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

# 2) Каталог стека
mkdir -p "$WORKDIR/backups" "$WORKDIR/scripts"

# 3) Ключ деплоя из GitHub Actions (appleboy/ssh-action ходит под root)
if [ -n "$DEPLOY_PUBKEY" ]; then
  mkdir -p /root/.ssh
  chmod 700 /root/.ssh
  touch /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys
  if grep -qxF "$DEPLOY_PUBKEY" /root/.ssh/authorized_keys; then
    echo "Ключ деплоя уже в authorized_keys"
  else
    printf '%s\n' "$DEPLOY_PUBKEY" >> /root/.ssh/authorized_keys
    echo "Ключ деплоя добавлен"
  fi
fi

# 4) .env — только если его ещё нет: секреты генерим один раз, иначе
#    перезапуск скрипта разошёлся бы с паролем внутри тома postgres_data.
if [ -f "$WORKDIR/.env" ]; then
  echo ".env уже существует — не трогаю"
else
  umask 077
  cat > "$WORKDIR/.env" <<EOF
# Сгенерировано provision-server.sh. Пароль БД менять нельзя без пересоздания
# тома postgres_data — он зашит в кластер при первом старте контейнера.
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)
AUTH_SECRET=$(openssl rand -base64 32)

# Публичный адрес: cookies и редиректы NextAuth (AUTH_URL), canonical/OG/sitemap (SITE_URL)
AUTH_URL=https://$DOMAIN
SITE_URL=https://$DOMAIN

# Первый админ — используется только сидом (node prisma/seed.js). Смени пароль!
ADMIN_EMAIL=admin@$DOMAIN
ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)

# Форма «Связаться с нами». Пароль приложения Яндекса, не пароль от аккаунта.
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
CONTACT_MAIL_TO=
EOF
  echo ".env создан: $WORKDIR/.env (заполни SMTP_*)"
fi

echo
echo "Готово. Дальше:"
echo "  1) scp с Mac: docker-compose.prod.yml, Caddyfile, scripts/backup.sh, scripts/restore.sh → $WORKDIR"
echo "  2) заполнить SMTP_* в $WORKDIR/.env"
echo "  3) docker login ghcr.io -u <github-user>   # образ приватный"
echo "  4) cd $WORKDIR && docker compose -f docker-compose.prod.yml up -d"
echo "  5) A-запись $DOMAIN → IP этого сервера, затем проверить https://$DOMAIN"
