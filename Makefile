# Бэкапы каталога. Переопределить сервер: make pull REMOTE=root@1.2.3.4
REMOTE ?= root@201.51.4.231
export REMOTE

.PHONY: pull pull-secrets restore backup help

help:
	@echo "make pull          — Mac: бэкап на сервере + скачать сюда"
	@echo "make pull-secrets  — Mac: скачать .env (редко, при смене секретов)"
	@echo "make restore FILE=~/gena-lavki-backups/....tgz — Mac: залить бандл и восстановить"
	@echo "make backup        — Server: сделать бэкап локально на сервере (запускать НА VPS)"

pull:
	bash scripts/pull-backup.sh

pull-secrets:
	bash scripts/pull-env.sh

restore:
	@test -n "$(FILE)" || { echo "Укажи FILE=~/gena-lavki-backups/....tgz"; exit 1; }
	bash scripts/push-restore.sh "$(FILE)"

backup:
	bash /opt/gena-lavki/scripts/backup.sh
