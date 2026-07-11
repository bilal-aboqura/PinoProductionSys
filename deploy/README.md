# VPS deployment

The VPS runs this application through Docker Compose. A systemd timer checks the
public `main` branch every minute; when a new commit is present it pulls that
commit, builds the image, applies Prisma migrations, and restarts the app.

## One-time server configuration

The server setup creates `/opt/pino-production-system/.env.production` from the
developer's local `.env` file. This file is intentionally ignored by Git.

The application is served over HTTP at the server IP until a domain name is
available. To enable HTTPS, set `server_name` to the domain in `nginx.conf`,
point DNS at the VPS, then issue a Let's Encrypt certificate.

## Updating production

Push a tested commit to `main`. The next timer run deploys it. Manual deploys
can be triggered with:

```sh
systemctl start pino-production-system-deploy.service
```

Inspect deployment output with:

```sh
journalctl -u pino-production-system-deploy.service -n 100 --no-pager
```
