#!/bin/sh
set -eu

if [ ! -f deploy/docker.env ]; then
  echo "Missing deploy/docker.env."
  echo "Create it first: cp deploy/docker.env.example deploy/docker.env"
  echo "Then replace JWT_SECRET, PRIVATE_FILE_SIGNING_SECRET, CORS_ORIGIN, and provider settings."
  exit 1
fi

docker build -f backend/Dockerfile -t aiweb-backend .
docker build --build-arg VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}" -f frontend/Dockerfile -t aiweb-frontend .
docker compose up --no-build -d
docker compose ps
