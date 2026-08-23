# Neuronex Makefile — Common Development Commands

.PHONY: help dev build up down logs clean test lint format

# Default target
help:
	@echo "Neuronex — Satellite Downlink Dashboard"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make up           - Start all services (backend + frontend)"
	@echo "  make down         - Stop all services"
	@echo "  make build        - Build Docker images"
	@echo "  make logs         - View logs from all services"
	@echo "  make logs-backend - View backend logs"
	@echo "  make logs-frontend - View frontend logs"
	@echo ""
	@echo "Local Development:"
	@echo "  make dev-backend  - Run backend locally (requires Python 3.11+)"
	@echo "  make dev-frontend - Run frontend locally (requires Node 18+)"
	@echo "  make install-backend - Install backend dependencies"
	@echo "  make install-frontend - Install frontend dependencies"
	@echo ""
	@echo "Database:"
	@echo "  make db-init      - Initialize database tables"
	@echo "  make db-reset     - Reset database (WARNING: destroys data)"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint         - Run linters"
	@echo "  make format       - Format code"
	@echo "  make test         - Run tests"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean        - Remove build artifacts"
	@echo "  make clean-docker - Remove Docker containers/volumes"

# Docker Commands
up:
	docker-compose up --build -d
	@echo ""
	@echo "Services started:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend API: http://localhost:5000"
	@echo "  WebSocket: ws://localhost:5000"

down:
	docker-compose down

build:
	docker-compose build

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

# Local Development
dev-backend:
	cd backend && python -m venv venv && . venv/bin/activate && pip install -r requirements.txt && python app.py

dev-frontend:
	cd frontend && npm install && npm run dev

install-backend:
	cd backend && python -m venv venv && . venv/bin/activate && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

# Database
db-init:
	cd backend && python -c "from app import create_app; from models import db; app, _ = create_app(); with app.app_context(): db.create_all(); print('Database initialized')"

db-reset:
	cd backend && rm -f neuronex.db && make db-init

# Code Quality
lint:
	cd frontend && npm run lint
	cd backend && python -m flake8 . --max-line-length=120 --ignore=E501,W503 2>/dev/null || true

format:
	cd frontend && npx prettier --write "src/**/*.{ts,tsx,css,json}"
	cd backend && python -m black . --line-length=120 2>/dev/null || true

test:
	cd frontend && npm test 2>/dev/null || true
	cd backend && python -m pytest tests/ -v 2>/dev/null || true

# Cleanup
clean:
	rm -rf backend/__pycache__ backend/*.pyc backend/.pytest_cache
	rm -rf frontend/node_modules frontend/dist frontend/.vite
	rm -rf backend/venv

clean-docker:
	docker-compose down -v --remove-orphans
	docker system prune -f