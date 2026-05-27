# Onde está o Molly? — preservation archive

> **Live:** https://molly.pealan.dev/ &nbsp;·&nbsp; **Source bundle:** [`bundle/`](bundle/)

An offline-playable rebuild of the **13 "Onde está o Molly?"** ("Where's
Molly?") games — Brazilian-Portuguese parodies of *Where's Wally?* that
ran on the early-2000s humor site [**HumorTadela**](https://web.archive.org/web/2005*/humortadela2.uol.com.br).
Each game is a single dense crowd scene; clicking the celebrity, cartoon
character, or random object hidden inside scores the hit.

The original site has been gone for years and survives only in fragments
on the Internet Archive. This repo is the reconstruction: every game
plays end-to-end in any modern browser, with **zero external requests**
at runtime.

![OG card](bundle/og-card.png)

---

## Run it locally

```bash
# anywhere with python3
python3 -m http.server 8000 --directory bundle/
# → http://localhost:8000/

# or, if you have Docker:
docker compose up preview        # → http://localhost:9876/
```

---

## What survived, what didn't

| asset                              | status              | notes                                                                                                   |
| ---------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------- |
| 13 game pages                      | ✅ preserved        | numbered 1–8, 10–14. Game 9 was never republished and is lost.                                          |
| scene images & character icons     | ✅ preserved        | served as-is from the captures.                                                                          |
| panel logic (counters, win modal)  | ✅ preserved        | original jQuery/jQuery-UI code, just unwrapped from the Wayback chrome.                                  |
| per-character gag popups (2000–07) | ❌ **lost**         | every capture returns HTTP 400. The original text-and-image gags that made the games funny are gone.    |
| per-character click *event*        | 🔁 **recreated**    | shared `js/molly-extras.js` wraps the page's `mollyAchou()` to show an icon + name toast + pulse ring. |

---

## How it was rebuilt

The original `humortadela2.uol.com.br` (2000–2007) has scene art that
returns HTTP 400 in every Wayback capture I could find. Dead end. But
the same games were republished on `humortadela.bol.uol.com.br` between
2012 and 2016, and **that** site is fully archived. So the rebuild
extracts from the revival and stitches in the original character lists
that are recoverable from the 2005-era pages.

```
┌──────────────────────────────────────────────────────────────────────┐
│  1. DISCOVERY                                                        │
│     Wayback CDX sweep across humortadela.* domains →                 │
│     identified humortadela.bol.uol.com.br (2012–16) as the only      │
│     source where scene art + icons survive with status 200.          │
│                                                                      │
│  2. EXTRACTION                                                       │
│     curl -K config batches (keep-alive, --retry-all-errors)          │
│     pulled 13 game pages + all referenced assets via the Wayback     │
│     `id_` modifier (raw archived content, no wrapper).               │
│                                                                      │
│  3. UNWRAPPING                                                       │
│     Stripped the Wayback toolbar, the UOL ad bar, the <base href>    │
│     injection, and the Facebook SDK. Stubbed window.FB locally so    │
│     the share button degrades gracefully ("indisponível offline").   │
│                                                                      │
│  4. EVENT RECREATION                                                 │
│     The original per-character gag popups (2000–07) are 400-only in  │
│     the archive — text content is unrecoverable. So js/molly-extras  │
│     wraps the page's own mollyAchou() and recreates the *event*: a   │
│     toast with the character's authentic icon + name, plus a pulse   │
│     ring at the click coords. Faithful to mechanic, not to text.     │
│                                                                      │
│  5. PORTFOLIO POLISH                                                 │
│     scripts/polish.py (idempotent) rebuilds a landing page above     │
│     the game grid, injects OG/Twitter meta into all 14 HTML files,   │
│     builds the 1200×630 share card with Pillow, and copies Molly     │
│     himself into favicon.gif.                                        │
└──────────────────────────────────────────────────────────────────────┘
```

A longer engineering log (per-iteration, with dead ends) lives in
[`WORK_DIARY.md`](WORK_DIARY.md).

---

## Repo layout

```
.
├── bundle/             ← the deployable static archive (this is what ships)
│   ├── index.html      ← landing page with the 13-game grid + "Sobre" details
│   ├── jogo-NN.html    ← 13 games (numbered 1–8, 10–14)
│   ├── css/, js/       ← jQuery / jQuery-UI 1.8.21 (vendored, no CDN)
│   ├── images/molly/   ← scenes, icons, apresentação banners
│   ├── og-card.png     ← 1200×630 social share card
│   └── favicon.gif     ← Molly himself, from jogo 1
├── infra/              ← Terraform: EC2 + EIP + SG + Route53 + scoped IAM policy
├── scripts/
│   ├── polish.py             ← idempotent: rebuilds landing, OG meta, favicon, card
│   └── server-provision.sh   ← idempotent: bootstraps molly-deploy + rrsync on the box
├── Dockerfile          ← dev image: Python + Pillow + ImageMagick + gh + rsync + terraform + awscli
├── docker-compose.yml  ← `dev` shell + `preview` http server on :9876
├── dev                 ← `./dev <cmd>` runs anything in the container
└── WORK_DIARY.md       ← session-by-session engineering log
```

The dev environment is dockerized so the polish script (which needs
Pillow + fonts) runs reproducibly on any host with Docker.

---

## Deploy

> **Full end-to-end runbook:** [DEPLOY.md](DEPLOY.md) covers domain purchase,
> AWS account setup, the CloudShell IAM bootstrap, `terraform apply`, DNS
> delegation, server-side bootstrap, the first `rsync`, troubleshooting, and
> cost breakdown. The summary below is the elevator pitch.


Static rsync to nginx, using a purpose-bound SSH alias:

```bash
rsync -avz --delete bundle/ pealan-prod-molly:/
```

The alias `pealan-prod-molly` lives in `~/.ssh/config` and binds to a
dedicated `ed25519` key. Server-side, that key's `authorized_keys` entry
uses `restrict,command="rrsync /var/www/molly.pealan.dev"` so the key
can *only* rsync into that one directory — no shell, no port forwarding,
no other docroots. Even on compromise the blast radius is one directory
tree. Least-privilege IAM, end-to-end.

The provisioning is split cleanly between infrastructure and configuration:

- **[`infra/`](infra/)** — Terraform module that creates the EC2 instance,
  Elastic IP, security group, EC2 key pair, and Route53 A record. One
  `terraform apply`, ~3 minutes, cost ~US$3/month in `sa-east-1`. Includes
  a scoped IAM policy ([`infra/iam-policy-gente-admin.json`](infra/iam-policy-gente-admin.json))
  so the deploy user gets only EC2 + Route53 — no IAM, no S3, nothing else.
- **[`scripts/server-provision.sh`](scripts/server-provision.sh)** —
  idempotent bootstrap that runs *on* the box once: creates the
  `molly-deploy` service user, the docroot, the scoped `authorized_keys`
  entry, and the `rrsync` symlink. Prints the nginx + certbot follow-up.

---

## Credits & legal

Original content © HumorTadela / UOL / BOL — preserved here for
historical and personal use only. All character likenesses belong to
their original creators. If you represent a rights holder and want
anything removed, open an issue.

Capture data via the [Internet Archive Wayback Machine](https://web.archive.org/).
