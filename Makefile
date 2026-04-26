SHELL := /bin/bash
NVM_SH := $(HOME)/.nvm/nvm.sh

.PHONY: dev stop install build prod help

help:
	@echo "make dev      Start backend + frontend in dev mode (Ctrl+C to stop both)"
	@echo "make stop     Kill running dev servers"
	@echo "make install  Install all dependencies"
	@echo "make build    Build frontend for production"
	@echo "make prod     Build and serve in production mode"

dev:
	@source $(NVM_SH); \
	  uv run uvicorn backend.main:app --reload --port 8000 & BACKEND=$$!; \
	  npm --prefix frontend run dev & FRONTEND=$$!; \
	  trap "kill $$BACKEND $$FRONTEND 2>/dev/null; exit 0" INT TERM; \
	  wait

stop:
	@pkill -f "uvicorn backend.main:app" 2>/dev/null && echo "Backend stopped." || echo "Backend was not running."
	@pkill -f "vite" 2>/dev/null && echo "Frontend stopped." || echo "Frontend was not running."

install:
	uv sync
	@source $(NVM_SH) && npm --prefix frontend install

build:
	@source $(NVM_SH) && npm --prefix frontend run build

prod: build
	uv run uvicorn backend.main:app --port 8000
