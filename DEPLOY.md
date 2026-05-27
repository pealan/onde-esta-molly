# Deploy — end-to-end runbook

This is the **"fresh laptop to live URL"** guide for getting this archive
hosted on your own infrastructure. If you just want to play the games
locally, see [README.md → Run it locally](README.md#run-it-locally) and skip
this file. If you want the *why* behind these choices, see
[WORK_DIARY.md](WORK_DIARY.md) — it captures dead-ends and decisions.

| | |
| --- | --- |
| **Total cost** | ~$12/yr (domain) + ~$4.50/mo (AWS) |
| **First-run time** | ~45 min, mostly waiting for DNS |
| **Recurring time** | ~10s for `rsync` after content changes |

---

## Prerequisites

| What | Where | Cost |
|------|-------|------|
| Docker + docker-compose | https://docker.com | free |
| git + a GitHub account | https://github.com | free |
| A domain | step 1 below | ~$12/yr |
| An AWS account | https://aws.amazon.com | free tier covers most setup |

You do **not** need `aws`, `terraform`, `gh`, `Pillow`, `python` or
`rsync` installed locally — they all live in the dev container
(`Dockerfile`).

---

## Step 1 — Pick and buy a domain

The deploy uses a **subdomain** (`molly.<your-domain>`) so the apex stays
free for whatever else you build.

### Watch out: parked .coms are expensive

I originally targeted `gente.com`. RDAP exposed it:

```
$ dig +short NS gente.com
ns1.abovedomains.com.
ns2.abovedomains.com.
```

The `abovedomains.com` nameservers (and the `421.` prefix on the actual NS
records) are GoDaddy's domain-monetization parking pattern: the domain is
**for sale** by a domainer, not abandoned. RDAP confirmed it was registered
in 2012 and still under renewal. Realistic asking price for a 5-letter
Portuguese `.com` held by a domainer for 13 years: **$5k–$50k+ USD**, way
out of scope for a portfolio piece.

**Rule of thumb:** if `dig NS <domain>` returns nameservers at any of
`abovedomains.com`, `parkingcrew.net`, `sedoparking.com`, `dan.com`,
`uniregistry-dns.*`, or similar — that domain is for sale, not free.

### What to buy

I went with `pealan.dev` at **Porkbun** (https://porkbun.com):
- ~$12/yr, same renewal, no upsells
- Lets you set custom nameservers in one click (we'll need this)
- `.dev` is on the [HSTS preload list](https://hstspreload.org/) — browsers
  *only* connect over HTTPS to `.dev`, which is a free security signal

Other reasonable registrars: Namecheap (~$14), Cloudflare Registrar
(at-cost ~$12 but they lock you to Cloudflare DNS).

Buy. Skip every add-on (WHOIS privacy at Porkbun is free, you don't need
their hosting / email / etc).

---

## Step 2 — AWS account

Create one at https://aws.amazon.com if you don't already have one. You
need a credit card. The first-year free tier covers most of what we use,
but a couple things bill from day one — see [Costs](#costs) below.

---

## Step 3 — Bootstrap the deploy IAM user (CloudShell)

Open **https://console.aws.amazon.com/cloudshell/** in your browser.

CloudShell is a free in-browser Linux terminal that's already authenticated
as your console session — no API keys involved. This lets us create the
deploy IAM user without ever generating long-lived root access keys (the
single thing AWS most loudly tells you not to do).

```bash
# inside CloudShell
git clone https://github.com/pealan/onde-esta-molly
cd onde-esta-molly/infra
bash bootstrap-iam.sh
```

The script:
1. Creates an IAM user `gente-admin` (idempotent — name kept for history
   despite the domain pivot; see WORK_DIARY)
2. Attaches `iam-policy-gente-admin.json` as an inline policy — grants
   only EC2 + Route53 + VPC actions this module needs. No IAM, no S3,
   nothing else.
3. Generates an access key and prints it

**Copy the access key now — the secret will never be displayed again.**

If you ever update the IAM policy file (e.g. this module gains new
permissions), re-run `bash bootstrap-iam.sh` from CloudShell. It's
idempotent: skips user creation, overwrites the policy, refuses to
silently mint a second access key.

---

## Step 4 — Configure AWS credentials locally

In the repo root on your laptop:

```bash
./dev aws configure --profile gente-admin
# AWS Access Key ID:     <paste from step 3>
# AWS Secret Access Key: <paste from step 3>
# Default region:        sa-east-1   (or change in infra/variables.tf)
# Default output format: json

# smoke test — should print the IAM user's ARN
./dev aws --profile gente-admin sts get-caller-identity
```

---

## Step 5 — Personal SSH key + terraform.tfvars

You need a personal SSH keypair to log into the EC2 box as `ubuntu` for
the initial server bootstrap. This is **separate** from the
`pealan-prod-molly` rrsync-scoped deploy key — that key is intentionally
shell-less.

```bash
test -f ~/.ssh/id_ed25519 || ssh-keygen -t ed25519 -C "$(whoami)@deploy-admin" -N ""
```

Generate the Terraform vars file (gitignored — has your IP and pubkey):

```bash
cat > infra/terraform.tfvars <<EOF
admin_public_key = "$(cat ~/.ssh/id_ed25519.pub)"
admin_ip_cidr    = "$(curl -s ifconfig.me)/32"
EOF

cat infra/terraform.tfvars   # confirm both lines look sane
```

---

## Step 6 — Terraform apply

```bash
./dev sh -c 'cd infra && terraform init'                   # one-time
./dev sh -c 'cd infra && terraform plan -out=tfplan'       # review what's about to happen
./dev sh -c 'cd infra && terraform apply tfplan'           # ~2 min
```

The module creates: VPC + subnet + IGW + route table + EC2 key pair +
security group (SSH pinned to your IP, HTTP/HTTPS public) + t4g.nano
Ubuntu 24.04 ARM instance (IMDSv2-only, encrypted gp3) + Elastic IP +
Route53 hosted zone for the apex + the A record for the subdomain.

Apply outputs include:
- `public_ip` — the Elastic IP
- `dns_name` — `molly.<your-domain>`
- `nameservers` — 4 records, paste these at your registrar (next step)
- `next_steps` — a runbook printed inline for steps 7–9

---

## Step 7 — Delegate DNS at your registrar

In Porkbun: **Domain Management → `<your-domain>` → Authoritative
Nameservers → Replace with custom nameservers**. Paste the 4 entries from
the `nameservers` Terraform output, save.

Propagation is usually minutes, sometimes hours. Verify:

```bash
dig +short molly.<your-domain>
# should return the public_ip from step 6
```

Re-run every minute or two until it resolves.

---

## Step 8 — Server-side bootstrap

Once DNS resolves:

```bash
ssh ubuntu@molly.<your-domain>          # accept host key on first connect

# in the SSH session:
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx rsync

curl -fsSLO https://raw.githubusercontent.com/pealan/onde-esta-molly/main/scripts/server-provision.sh
chmod +x server-provision.sh
sudo ./server-provision.sh
```

`server-provision.sh` creates the `molly-deploy` service user, the docroot
at `/var/www/molly.<your-domain>`, the scoped `authorized_keys` line, and
the `rrsync` symlink. On success it prints the nginx vhost + certbot
commands to run next — copy-paste them.

After certbot finishes, exit the SSH session.

---

## Step 9 — First deploy (from your laptop)

```bash
cd /path/to/onde-esta-molly
rsync -avz --delete bundle/ pealan-prod-molly:/
```

The path is `/` because the rrsync wrapper on the server chroots the key
into `/var/www/molly.<your-domain>` automatically. The alias
`pealan-prod-molly` lives in `~/.ssh/config` and binds to a dedicated key
— configure your own analog by editing that file.

Verify:

```bash
curl -sI https://molly.<your-domain>/                # → HTTP/2 200
curl -sI https://molly.<your-domain>/jogo-01.html    # → HTTP/2 200
```

Then open the URL in a browser and play a game end-to-end.

Subsequent deploys are just the `rsync` line.

---

## Troubleshooting (the things that bit me)

| Symptom | Cause + fix |
|---------|-------------|
| `aws: command not found` from your terminal | You ran it on the host, not the container. Use `./dev aws ...` or open CloudShell. |
| `[ERROR]: [Errno 13] Permission denied: '/home/dev/.aws/credentials'` | Named volume mounted at a path missing from the image → root-owned. Fixed in current Dockerfile. For an old build: `docker run --rm -v molly-games_aws-config:/v alpine chown -R 1000:1000 /v` |
| `[ERROR]: (Pager): Unable to redirect output to pager. ... 'less'` | AWS CLI v2 defaults to piping through less, which isn't in the slim image. Already fixed via `AWS_PAGER=""` in docker-compose.yml. |
| `Error acquiring the state lock` from Terraform | A previous container died holding the fcntl lock. Find + kill it: `docker ps --filter "name=molly-games-dev-run"` then `docker rm -f <name>`. Then `rm infra/.terraform.tfstate.lock.info` if it persists. |
| `VPCIdNotSpecified: No default VPC for this user` | Newer AWS accounts in non-US regions don't get a default VPC. The current Terraform module creates its own VPC; if you're on an older commit, `git pull`. |
| DNS still not resolving after >1 hour | Did you save the NS records at the registrar? Some registrars (Cloudflare via "import existing zone") cache conflicting records. `dig +trace molly.<your-domain>` shows the delegation chain. |
| Certbot fails: "no A record" | DNS hasn't propagated yet. Wait, re-check `dig`. Don't loop certbot — Let's Encrypt rate-limits failures per domain. |

---

## Costs

Worst case, 24/7 in `sa-east-1`:

| Item | Monthly | Notes |
|------|---------|-------|
| EC2 t4g.nano | $3.04 | The instance itself |
| EBS gp3, 8 GB | $0.96 | Root volume |
| Route53 hosted zone | $0.50 | Per zone, flat |
| Route53 queries | <$0.01 | First 1M queries free |
| Data transfer out | varies | First 100 GB/mo free |
| Elastic IP | $0.00 | Free while attached to a running instance |
| **Total** | **~$4.50/mo** | |

Domain renewal at Porkbun: separate, ~$12/yr.

To stop charges entirely:

```bash
./dev sh -c 'cd infra && terraform destroy'
```

This removes everything except the IAM user (kept so you can re-deploy
later). Domain registration is unaffected.

---

## What's deliberately NOT in this guide

- **Backups** — the bundle is regenerable from this repo + Wayback. Not
  worth the extra cost.
- **CDN** — Cloudflare in front of nginx would speed up global delivery,
  but the static archive is small and read-mostly cached anyway.
- **CI/CD** — a GitHub Action could `rsync` on push. Skipped because the
  archive is essentially static; manual `rsync` is two seconds.
- **Monitoring** — for a static site that survives nginx crashes (it'll
  systemd-restart) and AWS hardware failures (the instance is in a single
  AZ; cheap), this is overkill.
