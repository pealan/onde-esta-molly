#!/usr/bin/env python3
"""
polish.py — bundle polish for the "Onde está o Molly?" portfolio deploy.

Idempotent + re-runnable. Builds the OG share card, picks the favicon,
rewrites index.html with an "About" section + portfolio framing, and
injects OG/Twitter meta + favicon link into every game page.

Live URL is a single constant — change LIVE_URL_BASE and re-run when the
domain is live (or before deploy).
"""

from __future__ import annotations
import html
import os
import re
import shutil
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ── configuration ────────────────────────────────────────────────────────────
BUNDLE = Path("/work/bundle")
LIVE_URL_BASE = "https://molly.pealan.dev"          # production URL
SITE_TITLE = "Onde está o Molly?"
SITE_DESC = (
    "Arquivo dos 13 jogos de “caça ao Molly” do HumorTadela — "
    "paródia brasileira de “Onde está Wally?” preservada do Internet Archive."
)
GITHUB_REPO_URL = "https://github.com/pealan/onde-esta-molly"
PORTFOLIO_URL = ""   # not in scope yet

OG_CARD = "og-card.png"
FAVICON = "favicon.gif"

# Per-game titles transcribed from each game's apresentacao banner
# (bundle/images/molly/apresentacao/N.gif). Edition 9 was never republished.
GAME_TITLES = {
    1:  "Inferno",
    2:  "Molly na Praia",
    3:  "Mollywood",
    4:  "Parque",
    5:  "Céu",
    6:  "Festa Junina",
    7:  "Coliseu",
    8:  "Castelo Mal Assombrado",
    10: "Guerra de Tróia",
    11: "Sambódromo",
    12: "Olimpíadas",
    13: "Futebol",
    14: "Natal do Molly",
}

# Molly's authentic icon from jogo 1 (verified via <img id="iconeN"> lookup)
MOLLY_HERO_ICON = BUNDLE / "images/molly/icones/00001-q.gif"

BLUE = (0, 127, 255)            # #007FFF — HumorTadela blue
GOLD = (255, 204, 0)            # #FFCC00 — Molly accent
WHITE = (255, 255, 255)
CREAM = (239, 237, 221)         # #EFEDDD — page bg

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# ── OG share card ────────────────────────────────────────────────────────────
def build_og_card(out: Path) -> None:
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BLUE)
    d = ImageDraw.Draw(img)

    # subtle gold band at the top + bottom for branding
    d.rectangle((0, 0, W, 14), fill=GOLD)
    d.rectangle((0, H - 14, W, H), fill=GOLD)

    # Molly portrait, left side. Source is a 100×100 GIF — upscale w/ nearest
    # neighbour to keep the chunky pixel-art feel honest.
    molly = Image.open(MOLLY_HERO_ICON).convert("RGBA")
    target = 380
    molly = molly.resize((target, target), Image.NEAREST)
    # white-bg medallion behind Molly so transparency / palette quirks read
    medallion_r = target // 2 + 28
    cx, cy = 270, H // 2
    d.ellipse(
        (cx - medallion_r, cy - medallion_r, cx + medallion_r, cy + medallion_r),
        fill=WHITE,
        outline=GOLD,
        width=6,
    )
    img.paste(molly, (cx - target // 2, cy - target // 2), molly)

    # Right side: title + subtitle + URL
    title_font = ImageFont.truetype(FONT_BOLD, 78)
    sub_font   = ImageFont.truetype(FONT_BOLD, 28)
    url_font   = ImageFont.truetype(FONT_REG, 24)

    text_x = 520
    d.text((text_x, 180), "Onde está", font=title_font, fill=WHITE)
    d.text((text_x, 270), "o Molly?",   font=title_font, fill=GOLD)
    d.text((text_x, 380), "Arquivo dos 13 jogos do HumorTadela",
           font=sub_font, fill=WHITE)
    d.text((text_x, 420), "preservado do Internet Archive",
           font=sub_font, fill=WHITE)
    url_disp = LIVE_URL_BASE.replace("https://", "")
    d.text((text_x, 530), url_disp, font=url_font, fill=GOLD)

    img.save(out, "PNG", optimize=True)
    print(f"  og-card → {out.relative_to(BUNDLE)} ({out.stat().st_size // 1024} KB)")


# ── favicon ──────────────────────────────────────────────────────────────────
def ensure_favicon() -> None:
    dst = BUNDLE / FAVICON
    if dst.exists() and dst.stat().st_mtime >= MOLLY_HERO_ICON.stat().st_mtime:
        print(f"  favicon → {FAVICON} (unchanged)")
        return
    shutil.copyfile(MOLLY_HERO_ICON, dst)
    print(f"  favicon → {FAVICON} (copied from {MOLLY_HERO_ICON.name})")


# ── head injection ───────────────────────────────────────────────────────────
HEAD_MARKER = "<!-- molly-polish:head -->"

def head_block(page_title: str, page_url: str) -> str:
    """OG/Twitter meta + favicon link. Idempotent via the marker."""
    return (
        f"{HEAD_MARKER}\n"
        f'    <link rel="icon" type="image/gif" href="{FAVICON}">\n'
        f'    <meta property="og:type" content="website">\n'
        f'    <meta property="og:site_name" content="{html.escape(SITE_TITLE)}">\n'
        f'    <meta property="og:title" content="{html.escape(page_title)}">\n'
        f'    <meta property="og:description" content="{html.escape(SITE_DESC)}">\n'
        f'    <meta property="og:url" content="{page_url}">\n'
        f'    <meta property="og:image" content="{LIVE_URL_BASE}/{OG_CARD}">\n'
        f'    <meta property="og:image:width" content="1200">\n'
        f'    <meta property="og:image:height" content="630">\n'
        f'    <meta name="twitter:card" content="summary_large_image">\n'
        f'    <meta name="twitter:title" content="{html.escape(page_title)}">\n'
        f'    <meta name="twitter:description" content="{html.escape(SITE_DESC)}">\n'
        f'    <meta name="twitter:image" content="{LIVE_URL_BASE}/{OG_CARD}">\n'
        f"    <!-- /molly-polish:head -->"
    )

def inject_head(path: Path, page_title: str, page_url: str) -> None:
    src = path.read_text(encoding="utf-8")
    # remove any prior block (re-runnable)
    src = re.sub(
        re.escape(HEAD_MARKER) + r".*?<!-- /molly-polish:head -->\n?",
        "",
        src,
        flags=re.DOTALL,
    )
    block = head_block(page_title, page_url) + "\n"
    # insert before </head>
    if "</head>" not in src:
        print(f"  ! {path.name}: no </head>, skipping")
        return
    src = src.replace("</head>", block + "</head>", 1)
    path.write_text(src, encoding="utf-8")


# ── landing page rewrite ─────────────────────────────────────────────────────
def rewrite_index() -> None:
    """Rewrite index.html: keep the existing 13-card grid, replace the
    surrounding chrome with a proper landing page (hero, About details,
    portfolio-grade footer). Patches each tile label and banner alt with
    the real game title from GAME_TITLES."""
    path = BUNDLE / "index.html"
    src = path.read_text(encoding="utf-8")

    m = re.search(r'<div class="grid">.*?</div>\s*(?=<details|<footer|</body)', src, re.DOTALL)
    if not m:
        sys.exit("! index.html: could not locate <div class='grid'>…")
    grid_html = m.group(0).rstrip()

    def label_sub(m: re.Match) -> str:
        n = int(m.group(1))
        title = GAME_TITLES.get(n)
        return f"<b>Jogo {n} — {html.escape(title)}</b>" if title else m.group(0)

    def alt_sub(m: re.Match) -> str:
        n = int(m.group(1))
        title = GAME_TITLES.get(n)
        return f'alt="Jogo {n} — {html.escape(title, quote=True)}"' if title else m.group(0)

    # Idempotent: matches "Jogo N" only, not "Jogo N — Title".
    grid_html = re.sub(r"<b>Jogo (\d+)</b>", label_sub, grid_html)
    grid_html = re.sub(r'alt="Jogo (\d+)"', alt_sub, grid_html)

    new = LANDING_TEMPLATE.replace("{{GRID}}", grid_html)
    # inject_head() runs after this, so we leave </head> untouched here.
    path.write_text(new, encoding="utf-8")
    print("  index.html → rebuilt landing (grid + tile titles)")


LANDING_TEMPLATE = """<!DOCTYPE html>
<html lang="pt-br"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Onde está o Molly? — Arquivo HumorTadela</title>
<style>
 :root{--blue:#007FFF;--gold:#FFCC00;--cream:#EFEDDD;--ink:#222;--muted:#666}
 *{box-sizing:border-box}
 body{font-family:Verdana,Arial,sans-serif;margin:0;background:var(--cream);color:var(--ink);line-height:1.5}
 a{color:var(--blue)}
 header{background:var(--blue);color:#fff;padding:28px 24px;border-bottom:6px solid var(--gold)}
 .h-wrap{max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:24px;flex-wrap:wrap}
 .h-icon{width:96px;height:96px;border-radius:50%;background:#fff;border:4px solid var(--gold);
   display:flex;align-items:center;justify-content:center;flex:0 0 96px;overflow:hidden}
 .h-icon img{width:78px;height:78px;image-rendering:auto}
 .h-text{flex:1;min-width:280px}
 header h1{margin:0 0 6px;font-size:30px;letter-spacing:.5px}
 header p{margin:0;font-size:14px;opacity:.95;max-width:760px}
 .mobile-note{background:#FFF7D6;border-bottom:1px solid #e6d68e;padding:10px 24px;font-size:12px;color:#7a5a00;text-align:center}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
   gap:16px;padding:24px;max-width:1200px;margin:0 auto}
 .card{background:#fff;border:1px solid #ccc;border-radius:6px;overflow:hidden;
   text-decoration:none;color:#222;display:flex;flex-direction:column;
   box-shadow:0 1px 3px rgba(0,0,0,.15);transition:transform .1s,box-shadow .1s}
 .card:hover{transform:translateY(-3px);box-shadow:0 4px 12px rgba(0,0,0,.25)}
 .banner{background:#000;text-align:center;min-height:90px;display:flex;
   align-items:center;justify-content:center}
 .banner img{max-width:100%;display:block}
 .meta{padding:8px 12px;display:flex;justify-content:space-between;align-items:baseline}
 .meta b{font-size:15px;color:var(--blue)}
 .hs{font-size:11px;color:var(--muted)}
 .chars{padding:0 12px 12px;display:flex;flex-wrap:wrap;gap:4px}
 .c{font-size:10px;background:var(--gold);border-radius:3px;padding:1px 5px;color:#333}
 .about{max-width:900px;margin:8px auto 32px;padding:0 24px;font-size:14px;color:#333}
 .about summary{cursor:pointer;font-size:15px;font-weight:bold;color:var(--blue);padding:10px 0}
 .about summary:hover{text-decoration:underline}
 .about h3{margin:18px 0 6px;font-size:14px;color:var(--blue);text-transform:uppercase;letter-spacing:.5px}
 .about p{margin:0 0 10px}
 .about ul{margin:0 0 10px;padding-left:20px}
 .about code{background:#fff;border:1px solid #ddd;border-radius:3px;padding:1px 4px;font-size:12px}
 footer{padding:28px 24px;background:#1a1a1a;color:#bbb;font-size:12px;text-align:center}
 footer a{color:var(--gold);text-decoration:none}
 footer a:hover{text-decoration:underline}
 footer .row{margin:6px 0}
</style></head><body>
<header>
 <div class="h-wrap">
  <div class="h-icon"><img src="favicon.gif" alt=""></div>
  <div class="h-text">
   <h1>Onde está o Molly?</h1>
   <p>Os 13 jogos de “caça ao Molly” do HumorTadela — paródia brasileira de
      “Onde está Wally?”. Clique num jogo, depois clique nos personagens
      escondidos no cenário. Roda em qualquer navegador, sem plugins.</p>
  </div>
 </div>
</header>
<div class="mobile-note">Os jogos foram desenhados para tela de desktop — recomendado em telas largas.</div>

{{GRID}}

<details class="about">
 <summary>Sobre este arquivo — como foi feito</summary>
 <h3>O que é</h3>
 <p>O HumorTadela foi um dos sites de humor mais populares do Brasil entre 2000
    e 2007. Entre as muitas brincadeiras do site, “Onde está o Molly?” era uma
    paródia direta de <em>Where’s Wally?</em>: cenários lotados de celebridades
    da época em que cada personagem, quando achado, tocava um “causo” engraçado.</p>

 <h3>O que foi preservado</h3>
 <ul>
  <li>13 jogos jogáveis (numerados 1–8 e 10–14 — o jogo 9 nunca foi republicado).</li>
  <li>Cenários, ícones de cada personagem, telas de apresentação, jQuery/jQuery-UI.</li>
  <li>Pop-up de evento ao clicar (recriado): toast com o ícone e o nome do personagem
      + animação de pulso no local. O conteúdo original do “causo” não sobreviveu em
      nenhum arquivo da web (apenas páginas de erro), então a versão atual é uma
      recriação fiel do <em>evento</em>, não do texto.</li>
 </ul>

 <h3>Como foi feito</h3>
 <p>O site original (2000–2007) sobreviveu no Wayback Machine apenas parcialmente —
    cenários e popups dos “causos” respondem 400. A versão revivida (2012–2016, em
    <code>humortadela.bol.uol.com.br</code>) reaproveitou os mesmos jogos e ficou
    integralmente arquivada; foi essa a fonte usada.</p>
 <ul>
  <li>Varredura via Wayback CDX para encontrar todas as capturas relevantes.</li>
  <li>Extração das páginas e dos assets diretamente das capturas com status 200.</li>
  <li>Remoção da barra do UOL, do <code>&lt;base href&gt;</code> do Wayback e do SDK
      do Facebook; stub local de <code>FB.init</code>.</li>
  <li>Camada compartilhada <code>js/molly-extras.js</code> que envolve o
      <code>mollyAchou()</code> original para acrescentar o pop-up de evento.</li>
 </ul>
 <p>Resultado: pasta estática 100% offline, sem dependências externas em runtime.</p>
</details>

<footer>
 <div class="row">Arquivo preservado de <code>humortadela.bol.uol.com.br</code> via
   <a href="https://web.archive.org/">web.archive.org</a> — uso pessoal, preservação histórica.</div>
 <div class="row">Código e metodologia: <a href="REPLACEME_GHURL">github.com/pealan/onde-esta-molly</a></div>
</footer>
</body></html>
"""

# ── orchestration ────────────────────────────────────────────────────────────
def main() -> None:
    if not BUNDLE.is_dir():
        sys.exit(f"! {BUNDLE} not found")
    print(f"polish: bundle={BUNDLE}  url={LIVE_URL_BASE}")

    # 1. assets
    build_og_card(BUNDLE / OG_CARD)
    ensure_favicon()

    # 2. landing
    rewrite_index()
    # patch the portfolio/GH placeholders in the template that's now on disk
    idx = BUNDLE / "index.html"
    s = idx.read_text(encoding="utf-8")
    s = s.replace("REPLACEME_GHURL", GITHUB_REPO_URL)
    idx.write_text(s, encoding="utf-8")

    # 3. inject head meta + favicon link into every HTML page; patch the
    #    existing <title> on per-game pages to include the real game title.
    files = sorted(BUNDLE.glob("*.html"))
    for f in files:
        if f.name == "index.html":
            page_title = f"{SITE_TITLE} — Arquivo HumorTadela"
            page_url = f"{LIVE_URL_BASE}/"
        else:
            m = re.match(r"jogo-(\d+)\.html", f.name)
            if not m: continue
            n = int(m.group(1))
            real = GAME_TITLES.get(n)
            page_title = f"{SITE_TITLE} — Jogo {n}: {real}" if real else f"{SITE_TITLE} — Jogo {n}"
            page_url = f"{LIVE_URL_BASE}/{f.name}"
            if real:
                src = f.read_text(encoding="utf-8")
                # Idempotent: tolerate either "Jogo N" or "Jogo N: <anything>".
                src, count = re.subn(
                    r"<title>([^<]*Jogo )" + str(n) + r"(?::[^<]*)?</title>",
                    rf"<title>\g<1>{n}: {html.escape(real)}</title>",
                    src,
                    count=1,
                )
                if count:
                    f.write_text(src, encoding="utf-8")
        inject_head(f, page_title, page_url)
        print(f"  meta → {f.name}")

    # 4. live URL line in LEIA-ME.txt (idempotent)
    leiame = BUNDLE / "LEIA-ME.txt"
    if leiame.exists():
        text = leiame.read_text(encoding="utf-8")
        line = f"Versão online: {LIVE_URL_BASE}/"
        # drop any prior "Versão online:" line + blank-line tail
        text = re.sub(r"^Versão online:.*\n\n?", "", text, flags=re.M)
        if line in text:
            print("  LEIA-ME.txt (live URL line present)")
        else:
            # insert AFTER the full title block (===\n  TITLE\n===\n)
            text = re.sub(
                r"(={5,}\n[^\n]+\n={5,}\n)",
                r"\1\n" + line + "\n",
                text,
                count=1,
            )
            leiame.write_text(text, encoding="utf-8")
            print("  LEIA-ME.txt → live URL line added")

    print("polish: done")

if __name__ == "__main__":
    main()
