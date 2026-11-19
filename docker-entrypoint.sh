#!/bin/sh
set -e

mkdir -p /app/data
chown -R nextjs:nodejs /app/data

gosu nextjs npx prisma migrate deploy

exec gosu nextjs "$@"
