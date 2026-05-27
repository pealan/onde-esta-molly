/* ============================================================
 * molly-extras.js  —  per-character popup events + responsive layout
 * Part of the offline "Onde está o Molly?" archive.
 *
 * The original 2000s site popped a gag when you clicked a hidden
 * character. That gag content did not survive in any web archive,
 * so this recreates the *event*: clicking a character pops a toast
 * with their icon + name and pulses the spot on the scene.
 *
 * Also adds (purely additive):
 *   - A sticky game HUD with title, live counter, restart, help-stub.
 *   - Responsive scene <img>: <area coords> are rescaled to match the
 *     rendered image size (so hotspots track resize). Original coords
 *     are stashed in data-coords-orig on first run.
 *   - Layout flip: original 2-col <table> becomes a CSS grid that
 *     collapses to 1 col on narrow screens.
 *
 * It wraps the page's own mollyAchou() — the original counter /
 * "already found" / "you won" logic is left untouched.
 * ============================================================ */
(function () {
    "use strict";

    var PHRASES = ["Achou!", "Pegou!", "Tá na mira!", "Mandou bem!",
                   "É esse aí!", "Olha ele!", "Caçado!"];

    /* --- inject styles ------------------------------------------------ */
    function injectCss() {
        if (document.getElementById("molly-extras-css")) return;
        var css =
        /* toast + pulse (existing) */
        "#molly-toast{position:fixed;left:50%;top:64px;transform:translateX(-50%) scale(.7);" +
        "background:#fff;border:3px solid #007FFF;border-radius:10px;padding:10px 18px;" +
        "box-shadow:0 6px 24px rgba(0,0,0,.35);font-family:Verdana,Arial,sans-serif;" +
        "display:flex;align-items:center;gap:12px;z-index:99999;opacity:0;" +
        "transition:opacity .18s ease,transform .18s ease;pointer-events:none;max-width:340px}" +
        "#molly-toast.show{opacity:1;transform:translateX(-50%) scale(1)}" +
        "#molly-toast img{width:64px;height:64px;flex:0 0 64px;image-rendering:auto}" +
        "#molly-toast .mt-ph{font-size:11px;font-weight:bold;color:#FF8A00;" +
        "text-transform:uppercase;letter-spacing:.5px}" +
        "#molly-toast .mt-nm{font-size:17px;font-weight:bold;color:#003a8c;line-height:1.15}" +
        "#molly-toast.molly{border-color:#FFCC00;background:#FFF7D6}" +
        "#molly-toast.molly .mt-nm{color:#b06f00}" +
        ".molly-pulse{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;" +
        "border-radius:50%;border:3px solid #FFCC00;box-shadow:0 0 0 3px rgba(0,127,255,.6);" +
        "z-index:99998;pointer-events:none;animation:mollyPulse .85s ease-out forwards}" +
        "@keyframes mollyPulse{0%{transform:scale(.3);opacity:1}" +
        "100%{transform:scale(7);opacity:0}}" +

        /* sticky HUD */
        "#molly-hud{position:sticky;top:0;z-index:1000;" +
        "background:linear-gradient(180deg,#007FFF 0%,#0066cc 100%);color:#fff;" +
        "padding:8px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;" +
        "font:13px Verdana,Arial,sans-serif;border-bottom:4px solid #FFCC00;" +
        "box-shadow:0 2px 6px rgba(0,0,0,.25)}" +
        "#molly-hud .mh-back{color:#fff;font-weight:bold;text-decoration:none;opacity:.92}" +
        "#molly-hud .mh-back:hover{opacity:1;text-decoration:underline}" +
        "#molly-hud .mh-title{flex:1;font-size:15px;font-weight:bold;min-width:160px;" +
        "white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
        "#molly-hud .mh-counter{display:flex;gap:8px;align-items:center}" +
        "#molly-hud .mh-pill{background:rgba(255,255,255,.18);padding:4px 10px;" +
        "border-radius:999px;font-weight:bold;font-size:12px;white-space:nowrap}" +
        "#molly-hud .mh-pill.found{background:#FFCC00;color:#003a8c}" +
        "#molly-hud button{background:rgba(255,255,255,.18);color:#fff;border:none;" +
        "padding:4px 12px;border-radius:4px;cursor:pointer;font:bold 14px Verdana,Arial,sans-serif;" +
        "min-width:34px}" +
        "#molly-hud button:hover{background:rgba(255,255,255,.32)}" +

        /* layout flip (scoped to body.molly-layout so it doesn't bleed) */
        "body.molly-layout{margin:0;background:#EFEDDD}" +
        "body.molly-layout > table:first-of-type{width:100%;max-width:1600px;" +
        "margin:16px auto;border-spacing:0;border-collapse:collapse}" +
        "body.molly-layout > table:first-of-type > tbody > tr{display:grid;" +
        "grid-template-columns:1fr minmax(280px,360px);gap:24px;align-items:start}" +
        "body.molly-layout > table:first-of-type > tbody > tr > td{padding:0 16px;vertical-align:top}" +
        "@media (max-width:900px){body.molly-layout > table:first-of-type > tbody > tr{" +
        "grid-template-columns:1fr}}" +

        /* responsive scene image */
        "body.molly-layout img[usemap]{max-width:100%;height:auto;display:block;" +
        "margin:0 auto;border:1px solid #ccc;background:#000}" +

        /* hide the legacy chrome that the HUD replaces */
        "body.molly-layout > div:first-of-type[style*='background:#007FFF']{display:none}" +
        /* hide the duplicated counter block at the top of the right column */
        "body.molly-layout > table:first-of-type > tbody > tr > td:nth-child(2) > div:first-child{display:none}" +

        /* sidebar polish: tighten the icon grid */
        "body.molly-layout > table:first-of-type > tbody > tr > td:nth-child(2) > img{" +
        "max-width:100%;height:auto;display:block;margin:0 auto 8px;border-radius:4px}" +
        "body.molly-layout > table:first-of-type > tbody > tr > td:nth-child(2) font{" +
        "font-family:Verdana,Arial,sans-serif !important;font-size:14px !important;color:#003a8c !important}" +
        "body.molly-layout > table:first-of-type table{width:100%;border-collapse:collapse;margin-top:4px}" +
        "body.molly-layout > table:first-of-type table td{width:auto !important;height:auto !important;" +
        "padding:6px 4px;text-align:center}" +
        "body.molly-layout > table:first-of-type table img{width:64px !important;height:64px !important;" +
        "border-radius:4px;background:#fff;padding:2px;box-shadow:0 1px 3px rgba(0,0,0,.15)}" +
        "body.molly-layout > table:first-of-type table font{font-size:11px !important;display:block;" +
        "margin-top:2px}";
        var s = document.createElement("style");
        s.id = "molly-extras-css";
        s.appendChild(document.createTextNode(css));
        document.head.appendChild(s);
    }

    /* --- sticky HUD with title + counter + restart -------------------- */
    function buildHud() {
        if (document.getElementById("molly-hud")) return;
        /* derive label from <title>, e.g. "Onde está o Molly? — Jogo 1: Inferno" */
        var titleText = (document.title || "").trim();
        var m = /(Jogo\s+\d+(?:\s*[:—-]\s*[^—|]+)?)/i.exec(titleText);
        var label = m ? m[1].trim() : "Onde está o Molly?";

        var hud = document.createElement("header");
        hud.id = "molly-hud";
        hud.innerHTML =
            '<a class="mh-back" href="index.html">&laquo; Todos os jogos</a>' +
            '<span class="mh-title">' + label + '</span>' +
            '<span class="mh-counter">' +
                '<span class="mh-pill found" id="mh-found">0/0</span>' +
                '<span class="mh-pill" id="mh-tries">0 tent.</span>' +
            '</span>' +
            '<button class="mh-help" type="button" title="Mostrar pistas (em breve)">?</button>' +
            '<button class="mh-restart" type="button" title="Reiniciar">&#x21bb;</button>';
        document.body.insertBefore(hud, document.body.firstChild);
        document.body.classList.add("molly-layout");

        /* mirror counter from the original spans (left in DOM so the inline
           page script keeps writing to them) */
        var foundEl = document.getElementById("mollyEncontrados");
        var triesEl = document.getElementById("mollyTentativas");
        var mfound  = document.getElementById("mh-found");
        var mtries  = document.getElementById("mh-tries");
        function sync() {
            if (foundEl) mfound.textContent = (foundEl.textContent || "").trim() || "0/0";
            if (triesEl) mtries.textContent = ((triesEl.textContent || "0").trim()) + " tent.";
        }
        sync();
        if (window.MutationObserver) {
            var opts = { childList: true, characterData: true, subtree: true };
            if (foundEl) new MutationObserver(sync).observe(foundEl, opts);
            if (triesEl) new MutationObserver(sync).observe(triesEl, opts);
        }

        hud.querySelector(".mh-restart").addEventListener("click", function () {
            if (confirm("Reiniciar o jogo? Você perde o progresso atual.")) location.reload();
        });
        hud.querySelector(".mh-help").addEventListener("click", function () {
            alert("Em breve: pistas mostrando onde estão os personagens.");
        });
    }

    /* --- responsive scene: rescale <area coords> to rendered image ---- */
    function setupResponsiveScene() {
        var img = document.querySelector("img[usemap]");
        if (!img) return;
        var areas = document.querySelectorAll("map area");
        /* stash originals once */
        Array.prototype.forEach.call(areas, function (a) {
            if (!a.dataset.coordsOrig) {
                a.dataset.coordsOrig = a.getAttribute("coords") || "";
            }
        });
        function rescale() {
            if (!img.naturalWidth || !img.clientWidth) return;
            var scale = img.clientWidth / img.naturalWidth;
            Array.prototype.forEach.call(areas, function (a) {
                var orig = a.dataset.coordsOrig.split(/[ ,]+/).map(Number);
                var scaled = orig.map(function (n) { return Math.round(n * scale); });
                a.setAttribute("coords", scaled.join(","));
            });
        }
        if (img.complete && img.naturalWidth) rescale();
        img.addEventListener("load", rescale);
        window.addEventListener("resize", rescale);
        if (typeof ResizeObserver !== "undefined") {
            new ResizeObserver(rescale).observe(img);
        }
    }

    /* --- geometry: centre point of an <area> ------------------------- */
    function areaCenter(area) {
        var c = (area.getAttribute("coords") || "").split(/[ ,]+/).map(Number);
        var shape = (area.getAttribute("shape") || "rect").toLowerCase();
        if (shape === "circle") return { x: c[0], y: c[1] };
        if (shape === "rect")   return { x: (c[0] + c[2]) / 2, y: (c[1] + c[3]) / 2 };
        var xs = 0, ys = 0, n = 0;               /* poly: centroid */
        for (var i = 0; i + 1 < c.length; i += 2) { xs += c[i]; ys += c[i + 1]; n++; }
        return n ? { x: xs / n, y: ys / n } : { x: 0, y: 0 };
    }

    /* --- pulse ring over the scene at the found spot ----------------- */
    function pulseAt(area) {
        var img = document.querySelector("img[usemap]");
        if (!img) return;
        var box = img.getBoundingClientRect();
        /* coords were rescaled to match the rendered image size by
           setupResponsiveScene, so they're already in CSS-pixel space —
           no extra scale factor needed. */
        var ctr = areaCenter(area);
        var ring = document.createElement("div");
        ring.className = "molly-pulse";
        ring.style.left = (box.left + window.pageXOffset + ctr.x) + "px";
        ring.style.top  = (box.top  + window.pageYOffset + ctr.y) + "px";
        document.body.appendChild(ring);
        setTimeout(function () { ring.remove(); }, 900);
    }

    /* --- toast with the character's icon + name ---------------------- */
    var toastTimer = null;
    function toast(area) {
        var name = (area.getAttribute("alt") || "personagem").trim();
        var ordem = area.getAttribute("ordem");
        var iconEl = document.getElementById("icone" + ordem);
        var icon = iconEl ? iconEl.getAttribute("src") : "";
        var isMolly = /molly/i.test(name);

        var old = document.getElementById("molly-toast");
        if (old) old.remove();

        var t = document.createElement("div");
        t.id = "molly-toast";
        if (isMolly) t.className = "molly";
        var ph = isMolly ? "Achou o Molly!"
                         : PHRASES[Math.floor(Math.random() * PHRASES.length)];
        t.innerHTML =
            (icon ? '<img src="' + icon + '" alt="">' : "") +
            '<div><div class="mt-ph">' + ph + '</div>' +
            '<div class="mt-nm">' + name + '</div></div>';
        document.body.appendChild(t);

        /* fade in next frame, auto-dismiss */
        requestAnimationFrame(function () { t.classList.add("show"); });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            t.classList.remove("show");
            setTimeout(function () { if (t.parentNode) t.remove(); }, 250);
        }, isMolly ? 2600 : 1500);
    }

    /* --- wrap the page's mollyAchou once the DOM + inline JS exist ---- */
    function install() {
        injectCss();
        buildHud();
        setupResponsiveScene();
        if (typeof window.mollyAchou !== "function") return;
        if (window.mollyAchou.__mollyWrapped) return;
        var orig = window.mollyAchou;
        var wrapped = function (el) {
            var ordem = el.getAttribute("ordem");
            var firstTime = !(typeof mollysLista !== "undefined" &&
                              mollysLista[ordem] === 1);
            orig(el);                                  /* original logic */
            var over = (typeof mollyOver === "function" && mollyOver() === 1);
            if (firstTime && !over) { toast(el); pulseAt(el); }
        };
        wrapped.__mollyWrapped = true;
        window.mollyAchou = wrapped;
    }

    if (window.jQuery) {
        jQuery(install);                 /* runs after DOM ready */
    } else if (document.readyState !== "loading") {
        install();
    } else {
        document.addEventListener("DOMContentLoaded", install);
    }
})();
