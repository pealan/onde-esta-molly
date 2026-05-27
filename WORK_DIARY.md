# Work Diary — "Onde está o Molly?" extraction

Project: preserve & make offline-playable the HumorTadela "Onde está o Molly?"
hidden-object games (Brazilian "Where's Wally?" parody).

Workspace: `/home/pealan/molly-games/` (the session CWD `/fun` is read-only).

---

## 2026-05-18/19 — Iterations 1 & 2 (DONE)

**Investigation**
- Original site (`humortadela2.uol.com.br/h/jogo/inc/moll/`, 2000–2007):
  PHP image-map games with a per-character gag popup. Scene art **and** the
  174 gag popups survive in Wayback only as status-400 error pages — lost.
- Revived site (`humortadela.bol.uol.com.br` 2013–16 / `www.humortadela.com.br`
  2012): clean HTML + jQuery image-map games. **Fully archived.** This is the
  source we extracted from.
- 13 games exist (numbered 1–8, 10–14; game 9 was never republished).

**Delivered**
- `bundle/` — 13 offline-playable games + `index.html` + `LEIA-ME.txt`.
  Wayback wrapper, `<base href>`, UOL ad-bar and Facebook SDK stripped;
  `FB` stubbed; every asset (scenes, 193 icons, jQuery/jQuery-UI, theme
  images) pulled from intact status-200 captures. 0 unresolved refs.
- `onde-esta-o-molly.zip` — the bundle, 254 files, ~6.9 MB.

**Reference data kept** (for the next steps): `cdx_moll.txt`, `im_allcaps.txt`,
`sweep_*.txt`, `rv_*.txt` (Wayback CDX dumps); `maps/view_*.html` (the 13
*original* image-map pages — they carry old hotspot coords + `tipo=` names);
`revived/game_*.html` (untouched revived sources); `game_info.json`.

---

## 2026-05-19 — Iteration 3: popup events (DONE)

Goal was: clicking a character pops up an event, like the original game.
- Confirmed the authentic 2000s gags are unrecoverable (all 400s) and the
  2009 `c/achou*.html` popups were never archived either (only `c/_aux/`).
- Built `bundle/js/molly-extras.js` (shared, injected into all 13 pages):
  it wraps each page's inline `mollyAchou()` and, on a *new* find, shows a
  toast with the character's icon + name + a punchy phrase, and pulses a
  ring at the spot on the scene. Molly himself gets a longer golden toast.
  Original counter / "já achou" / "you won" logic untouched.
- Verified: `node --check` passes; `areaCenter()` geometry validated over
  all 187 hotspots; 350 refs resolve; re-zipped.
- Note: content is a *recreation* (icon+name), not the lost original gag.
  If real gag text is ever authored, drop it in a `dados/jogo-N.json`
  keyed by `ordem`/`alt` and have `molly-extras.js` prefer it.

---

## 2026-05-20 — Iteration 4: dockerize the dev env (DONE)

Host machine had none of the deploy tooling installed (no Pillow, no
ImageMagick, no `gh`, no `terraform`, no `aws`, no `apt-get` access).
Trying to fix the deploy workflow piecemeal would have either ballooned
host setup or left the project unreproducible. Dockerized the dev env
instead.

- `Dockerfile`: Python 3.12 + Pillow + ImageMagick + git + gh + rsync +
  openssh-client + terraform + AWS CLI v2 + DejaVu/Liberation fonts.
- `docker-compose.yml`: two services. `dev` (interactive, mounts the repo,
  `~/.ssh` ro, `~/.gitconfig` ro, named volumes for `gh-config` and
  `aws-config`). `preview` (one-shot `python3 -m http.server`).
- `./dev` wrapper script: exports host UID/GID + `exec docker compose run
  --rm dev "$@"` so any one-off works as `./dev <cmd>`.
- Preview lives on `http://localhost:9876/` (8000 + 8080 were taken on host).
- Files written from inside the container land owned by the host user.

Use this for any Pillow / ImageMagick / gh / rsync / terraform / aws work
— the host has none of them and `pip3` / `apt-get install` aren't available.

---

## 2026-05-20 — Iteration 5: deploy planning + polish (DONE)

Reframed the deploy from "upload a folder" to **portfolio piece**:
dedicated subdomain, polished landing page, public GitHub repo with
README that doubles as engineering write-up, social-share card.

**Bundle polish** (`scripts/polish.py`, idempotent re-runnable):
- 1200×630 OG share card with Molly icon on HumorTadela blue (Pillow only,
  no ImageMagick dependency — fonts loaded by absolute path).
- Favicon = `00001-q.gif` (Molly himself, from jogo 1).
- Landing page rewrite: hero + 13-game grid (preserved verbatim) +
  collapsible `<details>` "Sobre" section in Portuguese + dark footer
  with GitHub link.
- OG/Twitter meta + favicon link injected into all 14 HTML files via
  idempotent regex markers.
- LEIA-ME.txt gets a "Versão online:" line after the title block.

**SSH / IAM design** (followed least-privilege end-to-end):
- Purpose-bound ed25519 deploy key (not the personal one). `IdentitiesOnly
  yes` so SSH doesn't shotgun every key in the agent.
- Server-side `authorized_keys` line uses
  `restrict,command="rrsync /var/www/molly.<domain>"` — the key can
  *only* rsync into that one directory. No shell, no port forwarding,
  no exec, no other docroots. Blast radius on compromise: one directory.
- All wrapped behind an `ssh ~/.ssh/config` alias so the deploy command
  is just `rsync ... pealan-prod-molly:/`.

**GitHub repo** (`github.com/pealan/onde-esta-molly`, public):
- Whole workspace, not just `bundle/` — stronger portfolio framing
  showing methodology, not just the deployable artifact.
- `.gitignore` filters CDX dumps, sweep scratch, `pages/`, `maps/`,
  `revived/`, the old packaged zip, editor cruft.
- README in English (international read) with a methodology section
  drawn from this diary.

---

## 2026-05-26 — Domain pivot: gente.com → pealan.dev

Originally targeted `gente.com`. Hit the wall right before `terraform
apply`:

```
$ dig +short NS gente.com
ns1.abovedomains.com.
$ # RDAP: registered 2012, GoDaddy, NS prefix "421." = monetization parking
```

`abovedomains.com` + `421.` prefix = GoDaddy's domain-monetization
pattern. Translation: the domain is for sale by a domainer, not
abandoned. Estimated asking price for a 5-letter Portuguese .com held
13 years: $5k–$50k+. Way out of scope.

Pivoted to `pealan.dev` (~$12/yr at Porkbun):
- Personal brand domain — every future portfolio piece gets a free
  subdomain (`molly.pealan.dev`, `<next>.pealan.dev`, ...).
- `.dev` TLD is on the HSTS preload list — browsers refuse plain HTTP,
  free security signal.

Sweep across 26 files: infra/* (Terraform vars + comments), scripts/*,
bundle/* (re-ran polish for OG card + meta + LEIA-ME), README,
`~/.ssh/config` (alias `gente-prod-molly` → `pealan-prod-molly`).
The deploy key **file** kept its name (`id_ed25519_gente_molly`) —
renaming would have been pure churn, and the comment inside the key
itself documents the historical plan. The SSH config has a comment
explaining the rename for future-me.

---

## 2026-05-27 — AWS bootstrap journey (in progress)

CloudShell IAM bootstrap landed cleanly: `infra/bootstrap-iam.sh` runs
once, idempotent, creates the `gente-admin` IAM user with the inline
policy from `iam-policy-gente-admin.json`. No long-lived root access
keys ever touched disk.

Local Terraform apply hit two papercuts before the real issue:

1. **Volume permission**: named `aws-config` volume mounted at a path
   absent from the image → root-owned → uid 1000 can't write. Fixed in
   `Dockerfile` (`mkdir -p /home/dev/.aws && chmod 777`) plus a one-shot
   `chown` for the already-created volume.
2. **AWS pager**: AWS CLI v2 defaults to piping through `less`, which
   isn't in slim-bookworm. Fixed via `AWS_PAGER=""` in
   `docker-compose.yml`.

Then the real one:

```
Error: VPCIdNotSpecified: No default VPC for this user
```

Newer AWS accounts (especially outside `us-east-1`) don't get a default
VPC auto-created. Two paths: `aws ec2 create-default-vpc` (quick but
makes Terraform quietly depend on AWS-side magic) or explicit VPC in
the module. **Going with explicit** — for a portfolio piece, "fully
self-contained IaC, works on any account" is the right story.

**Partial state when this happened** (preserved across the failed apply):
- `aws_route53_zone.this` — created (`Z02776103MWN8PY9NSTQ7`)
- `aws_key_pair.admin` — created (`pealan-admin`)
- Everything else — not attempted

---

## NEXT STEPS (active)

### 1. Add explicit VPC to the Terraform module (in progress)

What to add to `infra/main.tf`:

```hcl
resource "aws_vpc" "this" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "pealan-prod-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.this.id
  cidr_block              = "10.0.0.0/24"
  availability_zone       = "${var.region}a"
  map_public_ip_on_launch = true
  tags = { Name = "pealan-prod-public" }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "pealan-prod-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
  tags = { Name = "pealan-prod-public" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}
```

Then wire `aws_security_group.web.vpc_id = aws_vpc.this.id` and
`aws_instance.web.subnet_id = aws_subnet.public.id`.

**IAM policy additions** (`iam-policy-gente-admin.json`, then re-run
`bash bootstrap-iam.sh` in CloudShell):
- `ec2:CreateVpc`, `ec2:DeleteVpc`, `ec2:ModifyVpcAttribute`
- `ec2:CreateSubnet`, `ec2:DeleteSubnet`, `ec2:ModifySubnetAttribute`
- `ec2:CreateInternetGateway`, `ec2:DeleteInternetGateway`,
  `ec2:AttachInternetGateway`, `ec2:DetachInternetGateway`
- `ec2:CreateRouteTable`, `ec2:DeleteRouteTable`,
  `ec2:AssociateRouteTable`, `ec2:DisassociateRouteTable`,
  `ec2:CreateRoute`, `ec2:DeleteRoute`

**Then**: `terraform apply` will pick up where it left off — zone and
key pair already exist (state has them), VPC stack gets created, then
SG/instance/EIP/A record.

### 2. Finish the deploy (steps 7–9 of DEPLOY.md)
DNS delegation at Porkbun → server-side bootstrap via SSH → first rsync.

### 3. Help overlay revealing answer locations (carried over)
Toggle that overlays markers on each scene `<img>` from the existing
`<area>` coords. Build into the shared `js/molly-extras.js` so the
popup wiring and the help overlay ship together.

### Open item
Per-game proper titles: the revived site renumbered editions, so "Jogo N"
≠ old edition N. Real titles can be recovered by matching each revived
game's character set against `maps/view_*.html` (`tipo=` names) and the
2005 index names. The `apresentacao` banner image already carries the
real name visually.
