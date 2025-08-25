help:
    just --list --justfile {{justfile()}}

prod:
    docker-compose up -d --build
    @echo "Interact with the website at \033]8;;http://127.0.0.1:4173\033\\http://127.0.0.1:4173\033]8;;\033\\"

dev:
    docker-compose -f docker-compose.dev.yml up -d --build
    @echo "Interact with the website at \033]8;;http://127.0.0.1:5173\033\\http://127.0.0.1:5173\033]8;;\033\\"

nuke:
    docker-compose down --remove-orphans
    docker volume prune -f

stop:
    docker-compose down
