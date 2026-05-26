# `infra/` — AWS infrastructure for molly.gente.com

A small, self-contained Terraform module that stands up the production
host for the [Onde está o Molly?](../) archive:

| Resource | What it is |
| --- | --- |
| `aws_instance.web` | One `t4g.nano` Ubuntu 24.04 ARM box, gp3 EBS, IMDSv2-only |
| `aws_security_group.web` | SSH **from your IP only**, HTTP/HTTPS public |
| `aws_eip.web` | Static IP so DNS survives stop/start |
| `aws_route53_record.molly` | `molly.gente.com` → the EIP |
| `aws_key_pair.admin` | Your laptop's pubkey, registered as the EC2 key pair |

Cost: roughly **US$3–4/month** in `sa-east-1` (instance + EIP + 8 GiB gp3).

Server-side configuration (the `molly-deploy` service user, the scoped
`authorized_keys` line, the `rrsync` chroot) is **not** in Terraform — it
lives in [`../scripts/server-provision.sh`](../scripts/server-provision.sh)
and runs once on the box after `terraform apply`. The split is intentional:
Terraform owns cloud resources, the bootstrap script owns OS configuration.

---

## One-time IAM setup

You shouldn't run Terraform with your AWS root account. Create a dedicated
IAM user with **only** the permissions this module needs:

1. **AWS Console → IAM → Users → Create user** — name it `gente-admin`,
   uncheck "Provide user access to the AWS Management Console" (this is a
   programmatic-only user).
2. **Attach a custom policy** — copy
   [`iam-policy-gente-admin.json`](iam-policy-gente-admin.json) verbatim.
   It grants EC2 (instance + SG + EIP + key pair) and Route53
   (record management) — no IAM, no S3, no nothing else.
3. **Create access keys** (Security credentials → Create access key →
   Command Line Interface). Save the *access key ID* and *secret*.
4. **Configure locally**:
   ```bash
   aws configure --profile gente-admin
   # AWS Access Key ID:     <paste>
   # AWS Secret Access Key: <paste>
   # Default region:        sa-east-1
   # Default output format: json
   ```
5. **Verify**:
   ```bash
   aws --profile gente-admin sts get-caller-identity
   ```

The Terraform `provider` block reads `profile = "gente-admin"` so it
picks these creds up automatically.

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
