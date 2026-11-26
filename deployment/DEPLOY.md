# Deploy a DrivioCars demo on your own server

This runs the whole marketplace on one Linux server with Docker: Next.js frontend, Django API,
background worker, PostgreSQL, Redis and Caddy (automatic HTTPS).

**Demo mode** keeps every production security setting (debug off, secure cookies, HTTPS, HSTS) but:

- shows a site-wide banner: *Demo site: checkout is simulated and no money is charged*
- only offers the simulated checkout ("Simulate successful payment" / "Simulate decline"), with no payment provider
- hides the site from search engines (`X-Robots-Tag: noindex`)
- prints emails to the logs instead of sending them (password reset won't reach users)

Do not use `deploy-vm.sh`. It is outdated and unsafe.

## 1. What the server needs

| | |
|---|---|
| OS | 64-bit Linux, e.g. Ubuntu 22.04/24.04 or Debian 12 |
| Memory | 4 GB RAM recommended. With 2 GB, add swap (step 2) or the frontend build gets killed |
| Disk | 20 GB free |
| Network | Ports **80** and **443** open to the internet, with nothing else (nginx/apache) using them |
| Domain | A domain or subdomain whose DNS **A record points at the server's public IP**. Caddy needs it to issue the HTTPS certificate |

Check that the domain resolves to the server before you start: `dig +short demo.yourdomain.com`.

## 2. Install Docker (once)

```sh
curl -fsSL https://get.docker.com | sudo sh   # Docker's official install script
sudo usermod -aG docker "$USER"                # then log out and back in
docker compose version                         # must print v2.x
```

Optional, only if the server has less than 4 GB RAM:

```sh
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

If nginx or apache is installed, stop it so Caddy can use ports 80/443:
`sudo systemctl disable --now nginx apache2 2>/dev/null`.

## 3. Get the code and configure it

```sh
git clone https://github.com/architprasar/driv.git drivio
cd drivio
cp deployment/env.demo.example deployment/.env.production
python3 -c "import secrets; print(secrets.token_urlsafe(48))"   # run twice: DB password, secret key
nano deployment/.env.production   # set PUBLIC_HOST, POSTGRES_PASSWORD, DJANGO_SECRET_KEY
```

`POSTGRES_PASSWORD` is only applied when the database is first created. Changing it later does not
change the real database password.

Use a short alias for the long Compose command:

```sh
alias drivio='docker compose --env-file deployment/.env.production -f deployment/compose.production.yml'
```

## 4. Start it

```sh
drivio up -d --build      # first build takes about 5-15 minutes
drivio ps                 # all services should be "running"/"healthy"; migrate shows "exited (0)"
```

The `migrate` service runs the launch check first. If it exits with an error, read it:

```sh
drivio logs migrate
```

Each `marketplace.E0xx` line names the setting to fix in `deployment/.env.production`. In demo mode
you will also see the warning `marketplace.W001`. That one is expected.

## 5. Create an admin account and demo content

```sh
drivio exec backend python manage.py createsuperuser        # your admin login (email + password)
drivio exec backend python manage.py seed_cms               # home/about/contact CMS pages
drivio exec backend python manage.py seed_data              # 30 sample cars (downloads photos)
drivio exec backend python manage.py seed_parts_catalog     # 32 sample parts
drivio exec backend python manage.py seed_auctions          # 3 sample auctions
```

The sample listings belong to `seller@drivio.com`, which gets a random password. To sign in as that
seller: `drivio exec backend python manage.py changepassword seller@drivio.com`.

## 6. Check it works

- `https://YOUR_DOMAIN` shows the yellow demo banner
- `https://YOUR_DOMAIN/api/health/ready/` returns `{"status": "ready"}`
- Django admin: `https://YOUR_DOMAIN/admin/` · CMS editor: `https://YOUR_DOMAIN/cms/`
- Register an account, add a part to the cart, check out, then press **Simulate successful payment**

Emails (verification, notifications, password reset) appear in the logs:

```sh
drivio logs --tail 200 worker backend | grep -A 15 "Subject:"
```

## 7. Update to the latest code

```sh
git pull
drivio up -d --build
```

## 8. Back up

```sh
drivio exec -T database pg_dump -U drivio drivio | gzip > "drivio-db-$(date +%F).sql.gz"
docker run --rm -v drivio_media:/data -v "$PWD":/backup alpine \
  tar czf "/backup/drivio-media-$(date +%F).tgz" -C /data .
```

Copy these files off the server. A backup that only lives on the same machine is not a backup.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `migrate` exited with `marketplace.E0xx` | Fix the named setting in `deployment/.env.production`, then `drivio up -d` |
| Browser shows a certificate error | DNS doesn't point at this server yet, or ports 80/443 are blocked. Check with `drivio logs gateway` |
| `backend` stays "unhealthy" | `drivio logs backend worker`. Readiness also needs the worker to be running |
| Build stops with exit code 137 | Out of memory. Add swap (step 2) |
| Port 80/443 "address already in use" | Another web server is running. Stop it (step 2) |

## Going live with real payments later

Set `DEMO_MODE=False`, configure a real email provider and a payment provider, and pass the full
launch check. Read `docs/market-readiness.md` first. The Cashfree path has open reconciliation bugs
that must be fixed before taking real money.
