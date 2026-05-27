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

## 2026-05-27 — Deploy lands. Site is live.

Continued from yesterday's `VPCIdNotSpecified` block. Added the explicit
VPC stack (`vpc + public subnet + igw + route_table + association`),
extended `iam-policy-gente-admin.json` with `ec2:*Vpc / *Subnet /
*InternetGateway / *RouteTable / *Route` actions, re-ran
`bootstrap-iam.sh` in CloudShell.

`terraform apply` on the first pass got 5/9 resources in before tripping
an AWS quirk:

```
InvalidParameterValue: Value (... — SSH admin-only ...) for parameter
GroupDescription is invalid. Character sets beyond ASCII are not
supported.
```

The em-dash in the security group description is non-ASCII; AWS rejects
it. Swapped `—` → `-` in `main.tf:102`, re-applied, the remaining 4
resources landed clean. Total infra: VPC + IGW + subnet + route table +
SG + t4g.nano + EIP `15.229.196.141` + zone + A record for
`molly.pealan.dev`.

DNS delegation at Porkbun (4 AWS nameservers, pasted from `terraform
output nameservers`) propagated in ~10 minutes.

Server-side bootstrap (over SSH as `ubuntu`):
- `apt-get install -y nginx certbot python3-certbot-nginx rsync`
- `scripts/server-provision.sh` — created `molly-deploy` user (uid 1001),
  docroot at `/var/www/molly.pealan.dev`, scoped `authorized_keys` line
  (`restrict,command="rrsync /var/www/molly.pealan.dev"`), rrsync
  symlinked from `/usr/share/rsync/rrsync` onto PATH.
- Nginx vhost wired, default site removed.
- `certbot --nginx --non-interactive --agree-tos --email ... --redirect`
  → cert valid until 2026-08-25, HTTP→HTTPS 301 redirect installed,
  systemd renewal timer in place.

Then the deploy itself hit one last papercut: the dev container couldn't
SSH (`No user exists for uid 1000`). OpenSSH calls `getpwuid()` and the
container had no `/etc/passwd` entry for uid 1000 — only a chmod-777
`/home/dev`. Fixed in the Dockerfile by adding a `dev` user via `useradd
-u ${USER_UID} -g ${USER_GID}` (build-args, default 1000:1000). Rebuilt
the image; `./dev rsync -avz --delete bundle/ pealan-prod-molly:/`
worked first try and uploaded 7 MB to the rrsync-scoped target.

Smoke test:
- `https://molly.pealan.dev/` → HTTP/1.1 200
- `https://molly.pealan.dev/jogo-01.html` → 200
- `https://molly.pealan.dev/images/molly/icones/00001-q.gif` → 200
- `http://molly.pealan.dev/` → 301 to HTTPS

Total elapsed across all iterations: 9 days; recurring deploy cost is now
~10s of `./dev rsync ...`.

---

## 2026-05-26/27 — AWS bootstrap journey (DONE)

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

### 1. Help overlay revealing answer locations (carried over)
Toggle that overlays markers on each scene `<img>` from the existing
`<area>` coords. Build into the shared `js/molly-extras.js` so the
popup wiring and the help overlay ship together.

### Open item
Per-game proper titles: the revived site renumbered editions, so "Jogo N"
≠ old edition N. Real titles can be recovered by matching each revived
game's character set against `maps/view_*.html` (`tipo=` names) and the
2005 index names. The `apresentacao` banner image already carries the
real name visually.
