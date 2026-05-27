# `infra/` — AWS infrastructure for molly.pealan.dev

A small, self-contained Terraform module that stands up the production
host for the [Onde está o Molly?](../) archive:

| Resource | What it is |
| --- | --- |
| `aws_instance.web` | One `t4g.nano` Ubuntu 24.04 ARM box, gp3 EBS, IMDSv2-only |
| `aws_security_group.web` | SSH **from your IP only**, HTTP/HTTPS public |
| `aws_eip.web` | Static IP so DNS survives stop/start |
| `aws_route53_zone.this` | Hosted zone for the apex domain (delegate NS at registrar) |
| `aws_route53_record.molly` | `molly.pealan.dev` → the EIP |
| `aws_key_pair.admin` | Your laptop's pubkey, registered as the EC2 key pair |

Cost: roughly **US$3–4/month** in `sa-east-1` (instance + EIP + 8 GiB gp3).

Server-side configuration (the `molly-deploy` service user, the scoped
`authorized_keys` line, the `rrsync` chroot) is **not** in Terraform — it
lives in [`../scripts/server-provision.sh`](../scripts/server-provision.sh)
and runs once on the box after `terraform apply`. The split is intentional:
Terraform owns cloud resources, the bootstrap script owns OS configuration.

---

## One-time IAM setup

Don't run Terraform as the AWS root account. Create a dedicated `gente-admin`
IAM user with **only** the permissions this module needs.

The cleanest way is from **[AWS CloudShell](https://console.aws.amazon.com/cloudshell/)** —
a free in-browser terminal that's already authenticated as your console
session. No long-lived root access keys ever need to exist on disk.

```bash
# inside CloudShell:
git clone https://github.com/pealan/onde-esta-molly && cd onde-esta-molly/infra
bash bootstrap-iam.sh
```

[`bootstrap-iam.sh`](bootstrap-iam.sh) is idempotent. It creates the user,
attaches [`iam-policy-gente-admin.json`](iam-policy-gente-admin.json) as
an inline policy (EC2 + Route53 only — no IAM, no S3, nothing else), and
prints a fresh access key in `aws configure` format. Copy it to your
laptop, then close the CloudShell tab.

On your laptop:

```bash
./dev aws configure --profile gente-admin
# paste the access key + secret from the script's output
# region: sa-east-1
# output: json

./dev aws --profile gente-admin sts get-caller-identity   # smoke test
```

The Terraform `provider` block reads `profile = "gente-admin"`, so it
picks these creds up automatically.

> **Why CloudShell and not local-with-root-keys?** Generating long-lived
> access keys for the root account is the practice AWS most loudly tells
> you not to do — those keys grant full account access and tend to leak.
> CloudShell uses temporary session credentials from your existing login,
> so the only persistent key in this whole flow is the scoped `gente-admin`
> one this module needs.

> **Updating the IAM policy?** Re-running `bash bootstrap-iam.sh` in
> CloudShell is idempotent — it overwrites the inline policy with the
> current file contents. Use this whenever `iam-policy-gente-admin.json`
> changes (e.g. when this module needs a new IAM action).

---

## Apply

From the repo root:

```bash
# 1. fill in your two required values
cp infra/terraform.tfvars.example infra/terraform.tfvars
$EDITOR infra/terraform.tfvars
#   admin_public_key = "ssh-ed25519 AAAA... pealan@gente-admin"
#   admin_ip_cidr    = "$(curl -s ifconfig.me)/32"

# 2. plan + apply
cd infra
terraform init
terraform plan       # review what's about to be created
terraform apply      # type 'yes'
```

The `next_steps` output walks you through SSH-bootstrap → rsync → smoke
test. Total time end-to-end: ~5 minutes after the apply finishes.

---

## Teardown

```bash
cd infra
terraform destroy
```

Destroys the instance, EIP, security group, key pair, and DNS record.
Costs stop immediately.

---

## Design choices worth noting

- **`sa-east-1` (São Paulo)** as default region — keeps latency low for the
  site's Brazilian-Portuguese audience. Override with `region = "us-east-1"`
  in `terraform.tfvars` if you want cheaper US pricing.
- **t4g.nano (Graviton ARM)** — cheapest serious instance, fine for static
  nginx. AMI lookup is filtered to `arm64` to match.
- **IMDSv2 required** (`http_tokens = "required"`) — blocks SSRF-based
  credential theft against the instance metadata service. This is the
  default for new launches as of late 2024, but pinning it documents intent.
- **Encrypted root volume** (`encrypted = true`) — costs nothing extra,
  protects data at rest if the underlying hardware is ever recycled.
- **SSH pinned to your IP** — `admin_ip_cidr` is required (no default), so
  you can't accidentally expose SSH to the world. If your IP changes, run
  `terraform apply` again with the new value.
- **State is local** (`terraform.tfstate` is gitignored) — fine for a
  single-operator portfolio deploy. For a team, migrate to an S3 backend
  with DynamoDB locking.
- **Default tags** (`Project`, `ManagedBy`, `Repo`) apply to every
  resource — makes bills + audits readable.
