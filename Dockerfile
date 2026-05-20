FROM python:3.12-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        imagemagick \
        git \
        openssh-client \
        rsync \
        curl \
        ca-certificates \
        fonts-dejavu \
        fonts-liberation \
        gnupg \
        dnsutils \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        | tee /usr/share/keyrings/githubcli-archive-keyring.gpg >/dev/null \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir Pillow==11.0.0

# Loosen ImageMagick policy so PNG/JPG/GIF read+write are allowed under
# Debian's stock cautious policy (won't matter if we only use Pillow, but
# handy if a script falls back to `convert`).
RUN sed -i 's|<policy domain="coder" rights="none" pattern="\(PS\|EPS\|PDF\|XPS\)"/>|<!-- & -->|g' /etc/ImageMagick-6/policy.xml || true

# Pre-create a writable HOME that any host UID can use.
RUN mkdir -p /home/dev/.config/gh /home/dev/.cache \
    && chmod -R 777 /home/dev

WORKDIR /work
