#!/usr/bin/env bash
# ============================================================================
# molly.pealan.dev — server-side provisioning
#
# Bootstraps the deploy target for the "Onde está o Molly?" archive on a
# fresh Debian/Ubuntu host. Run ONCE on the server, as root (or with sudo).
#
# What this does, in order:
#   1. Creates a dedicated, password-less service user `molly-deploy`
#   2. Creates the docroot at /var/www/molly.pealan.dev (writable by service user)
#   3. Installs the client-side ed25519 public key, scoped via OpenSSH's
#      `restrict` directive + rrsync — the key can ONLY rsync into that one
#      directory, no shell, no port forwarding, no exec.
#   4. Symlinks rrsync onto PATH if your distro hides it under /usr/share/doc.
#
# What this does NOT do (handle these separately, see "next steps" at end):
#   - DNS A record for molly.pealan.dev
#   - nginx vhost + TLS via certbot
#   - The first rsync upload
#
# Why scoped key + rrsync: least-privilege IAM. If the deploy key is ever
# compromised, the blast radius is exactly one directory tree — no shell,
# no lateral movement, no other docroots, no system files.
# ============================================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Run as root (or with sudo)." >&2
    exit 1
fi

DEPLOY_USER="molly-deploy"
DOCROOT="/var/www/molly.pealan.dev"
PUBKEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDQsIli3ORU+rxjZh8EeC48BruZ98CIP2fFeF4d2sP7O pealan-prod-molly deploy key (2026-05-20)'

# 1. Service user — no password, no sudo. Default shell so rsync can exec,
#    but the authorized_keys `restrict` directive blocks interactive login.
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
    adduser --disabled-password --gecos "molly archive deploy" "$DEPLOY_USER"
fi

# 2. Docroot — owned by service user, group www-data so nginx can read.
#    setgid (2xxx) keeps that group inherited by future files.
install -d -o "$DEPLOY_USER" -g www-data -m 2775 "$DOCROOT"

# 3. authorized_keys — install once, idempotently.
SSH_DIR="/home/$DEPLOY_USER/.ssh"
AUTH_KEYS="$SSH_DIR/authorized_keys"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 700 "$SSH_DIR"

SCOPED_LINE="restrict,command=\"rrsync $DOCROOT\" $PUBKEY"
if ! grep -qxF "$SCOPED_LINE" "$AUTH_KEYS" 2>/dev/null; then
    echo "$SCOPED_LINE" >> "$AUTH_KEYS"
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"

# 4. rrsync — on Debian/Ubuntu it ships under /usr/share/doc/rsync/scripts/
#    (or /usr/share/rsync/ on newer releases) and isn't on PATH by default.
if ! command -v rrsync >/dev/null 2>&1; then
    for candidate in \
        /usr/share/rsync/rrsync \
        /usr/share/doc/rsync/scripts/rrsync \
        /usr/share/doc/rsync/scripts/rrsync.gz
    do
        if [[ -e "$candidate" ]]; then
            if [[ "$candidate" == *.gz ]]; then
                gunzip -kf "$candidate"
                candidate="${candidate%.gz}"
            fi
            ln -sf "$candidate" /usr/local/bin/rrsync
            chmod +x /usr/local/bin/rrsync
            break
        fi
    done
fi

if ! command -v rrsync >/dev/null 2>&1; then
    echo "WARNING: rrsync not found. Install rsync's contrib scripts, then" >&2
    echo "         symlink rrsync into /usr/local/bin/ before deploying." >&2
    exit 2
fi

cat <<DONE
✅ molly-deploy provisioned. Docroot: $DOCROOT

Next on the server:

    apt-get install -y nginx certbot python3-certbot-nginx

    cat > /etc/nginx/sites-available/molly.pealan.dev <<'NGINX'
    server {
        listen 80;
        listen [::]:80;
        server_name molly.pealan.dev;
        root $DOCROOT;
        index index.html;
        location / { try_files \$uri \$uri/ =404; }
    }
    NGINX

    ln -sf /etc/nginx/sites-available/molly.pealan.dev /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    certbot --nginx -d molly.pealan.dev

Then from your laptop:

    rsync -avz --delete bundle/ pealan-prod-molly:/
    # path is "/" because rrsync chroots the key into $DOCROOT
DONE
