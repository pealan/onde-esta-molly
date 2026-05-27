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

# HashiCorp's apt repo (terraform) + AWS CLI v2 — both used by infra/.
# AWS CLI v2 ships as a static bundle, not via apt; pick arch dynamically.
RUN curl -fsSL https://apt.releases.hashicorp.com/gpg \
        | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com bookworm main" \
        > /etc/apt/sources.list.d/hashicorp.list \
    && apt-get update && apt-get install -y --no-install-recommends terraform unzip \
    && AWS_ARCH=$(uname -m | sed 's/arm64/aarch64/') \
    && curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" -o /tmp/awscliv2.zip \
    && unzip -q /tmp/awscliv2.zip -d /tmp \
    && /tmp/aws/install \
    && rm -rf /tmp/aws /tmp/awscliv2.zip /var/lib/apt/lists/*

RUN pip install --no-cache-dir Pillow==11.0.0

# Loosen ImageMagick policy so PNG/JPG/GIF read+write are allowed under
# Debian's stock cautious policy (won't matter if we only use Pillow, but
# handy if a script falls back to `convert`).
RUN sed -i 's|<policy domain="coder" rights="none" pattern="\(PS\|EPS\|PDF\|XPS\)"/>|<!-- & -->|g' /etc/ImageMagick-6/policy.xml || true

# Pre-create a writable HOME that any host UID can use.
# Named-volume mount points (.config/gh, .aws) must exist in the image with
# writable perms — otherwise Docker creates them as root-owned on first
# mount and non-root container users can't write to them.
RUN mkdir -p /home/dev/.config/gh /home/dev/.cache /home/dev/.aws \
    && chmod -R 777 /home/dev

WORKDIR /work
