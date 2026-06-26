# Database Connection config
DB_DRIVER=postgres
DB_STRING="host=localhost port=5432 user=postgres dbname=dailytimes password=postgres sslmode=disable"
MIG_DIR=migrations

.PHONY: mig-status mig-create mig-up mig-down mig-reset mig-redo

app:
	go run ./cmd/server

mig-status:
	goose -dir $(MIG_DIR) $(DB_DRIVER) $(DB_STRING) status

mig-create:
	goose -dir $(MIG_DIR) $(DB_DRIVER) $(DB_STRING) create $(name) sql

mig-up:
	goose -dir $(MIG_DIR) $(DB_DRIVER) $(DB_STRING) up

mig-down:
	goose -dir $(MIG_DIR) $(DB_DRIVER) $(DB_STRING) down

mig-reset:
	goose -dir $(MIG_DIR) $(DB_DRIVER) $(DB_STRING) reset

mig-redo:
	goose -dir $(MIG_DIR) $(DB_DRIVER) $(DB_STRING) redo
