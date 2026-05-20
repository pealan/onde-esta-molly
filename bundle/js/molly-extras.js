/* ============================================================
 * molly-extras.js  —  per-character popup events
 * Part of the offline "Onde está o Molly?" archive.
 *
 * The original 2000s site popped a gag when you clicked a hidden
 * character. That gag content did not survive in any web archive,
 * so this recreates the *event*: clicking a character pops a toast
 * with their icon + name and pulses the spot on the scene.
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
        "#molly-toast{position:fixed;left:50%;top:24px;transform:translateX(-50%) scale(.7);" +
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
        "100%{transform:scale(7);opacity:0}}";
        var s = document.createElement("style");
        s.id = "molly-extras-css";
        s.appendChild(document.createTextNode(css));
        document.head.appendChild(s);
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
        var sx = img.naturalWidth ? box.width / img.naturalWidth : 1;
        var sy = img.naturalHeight ? box.height / img.naturalHeight : 1;
        var ctr = areaCenter(area);
        var ring = document.createElement("div");
        ring.className = "molly-pulse";
        ring.style.left = (box.left + window.pageXOffset + ctr.x * sx) + "px";
        ring.style.top  = (box.top  + window.pageYOffset + ctr.y * sy) + "px";
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
