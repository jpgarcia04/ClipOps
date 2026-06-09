#!/bin/sh
set -e

echo "⏳ Syncing database schema with Prisma (db push)..."
# `prisma db push` creates/updates the tables to match prisma/schema.prisma.
# It is idempotent and a good fit for getting a fresh environment running.
# For a production workflow with history, switch to `prisma migrate deploy`.
npx prisma db push --skip-generate

echo "🚀 Starting ClipOps (Next.js)..."
exec npm run start
