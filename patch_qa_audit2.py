#!/usr/bin/env python3
"""ty full-audit fixes, part 2: unused import, theme overrides, hydration-safe boot."""
from pathlib import Path

ROOT = Path("/opt/sochi-portal-staging")

# ------------------------------------------------ 1) unused import in clubs page
clubs = ROOT / "src/components/catalog/ClubsCatalogClient.tsx"
text = clubs.read_text()
line = "import YandexDirections from '@/components/YandexDirections';\n"
if "YandexDirections" in text and text.count("YandexDirections") == 1:
    clubs.write_text(text.replace(line, ""))
    print("OK clubs: removed unused YandexDirections import")
else:
    print("skip clubs import (still used or already gone)")

# --------------------------------------------------------- 2) theme.css overrides
theme = ROOT / "public/brand/theme.css"
css = theme.read_text()
MARKER = "qa-full-audit-20260912"
BLOCK = """

/* qa-full-audit-20260912 — layout hygiene found in the full ty audit */

/* Cabinet: the Navbar is sticky and already in flow, so the old fixed-chrome
   padding showed up as an ~75px empty band under the header. */
html.is-cabinet .main-content,
html.yp-cabinet-flow .main-content,
html.is-cabinet:not(.yp-messages-flow):not(:has(.profile-edit-page)) .main-content,
html.is-admin.is-cabinet:not(.yp-messages-flow):not(:has(.profile-edit-page)) .main-content,
body.is-admin.is-cabinet .main-content,
body.is-cabinet:not(.yp-messages-flow):not(:has(.profile-edit-page)) .main-content,
body.is-cabinet .main-content {
  padding-top: 0 !important;
}

/* Admin shell on phones: 'top'/'main' areas with no explicit rows stretched the
   sticky bar to ~292px of mostly empty white. */
@media (max-width: 1024px) {
  .admin-layout-wrapper {
    grid-template-rows: auto minmax(0, 1fr) !important;
  }
  .admin-mobile-bar {
    align-self: start !important;
  }
  /* Page title shares the card gutter instead of hugging the screen edge. */
  .admin-page-header {
    padding-inline: 0.15rem !important;
  }
}

@media (max-width: 899px) {
  /* Chat list view: the desktop "Выберите диалог" pane wasted ~360px below the list. */
  .messages-root:not(.is-thread) .messages-thread {
    display: none !important;
  }
  /* Long names broke mid-word in the profile hero. */
  .profile-hero__name {
    word-break: normal !important;
    overflow-wrap: break-word !important;
    hyphens: auto !important;
  }
  .profile-hero__name-row {
    min-width: 0 !important;
    flex: 1 1 auto !important;
  }
}
"""
if MARKER in css:
    print("skip theme.css (marker present)")
else:
    theme.write_text(css + BLOCK)
    print("OK theme.css overrides appended")

# ----------------------------------------------- 3) header-boot: hydration + 401
boot = ROOT / "public/brand/header-boot.js"
js = boot.read_text()

HELPER = """
/* qa-full-audit-20260912: run brand DOM tweaks only after React hydration and
   never ask /api/user/profile as a guest (guest requests answered 401). */
(function(){
  function reactAttached(el){
    if(!el) return false;
    for(var k in el){ if(k.indexOf("__reactFiber$")===0 || k.indexOf("__reactProps$")===0) return true; }
    return false;
  }
  function anchor(){
    return document.querySelector(".nav-account-trigger, .nav-auth-mobile__profile, header.glass-nav, .glass-nav");
  }
  window.ypAfterHydration = function(fn){
    var tries = 0;
    (function wait(){
      tries += 1;
      var el = anchor();
      if((el && reactAttached(el)) || tries > 60){ try{ fn(); }catch(e){} return; }
      setTimeout(wait, 120);
    })();
  };
  window.ypHasSession = function(){
    try{ if(localStorage.getItem("yp-session")==="1") return true; }catch(e){}
    return document.documentElement.classList.contains("has-session");
  };
})();
"""

if "qa-full-audit-20260912" in js:
    print("skip header-boot (already patched)")
else:
    # profile-card painter: gate the fetch on a session and defer to hydration
    old_card = """  function run(){
    fetch("/api/user/profile",{credentials:"same-origin"}).then(function(r){
      return r.ok?r.json():null;
    }).then(function(p){ paintCard(p||{}); }).catch(function(){ paintCard({}); });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setTimeout(run, 600);"""
    new_card = """  function run(){
    if(!window.ypHasSession || !window.ypHasSession()) return;
    fetch("/api/user/profile",{credentials:"same-origin"}).then(function(r){
      return r.ok?r.json():null;
    }).then(function(p){ paintCard(p||{}); }).catch(function(){ paintCard({}); });
  }
  function boot(){ if(window.ypAfterHydration) window.ypAfterHydration(run); else run(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  setTimeout(boot, 600);"""
    if old_card not in js:
        raise SystemExit("FAIL header-boot: profile-card runner not found")
    js = js.replace(old_card, new_card, 1)

    # chip painter: defer to hydration (it inserts nodes into React-owned markup)
    old_chip = """  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setTimeout(run, 400);
  setTimeout(run, 1400);"""
    new_chip = """  function boot(){ if(window.ypAfterHydration) window.ypAfterHydration(run); else run(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1400);"""
    if old_chip not in js:
        raise SystemExit("FAIL header-boot: chip runner not found")
    js = js.replace(old_chip, new_chip, 1)

    boot.write_text(HELPER + js)
    print("OK header-boot: hydration-safe + no guest profile fetch")

print("part 2 done")
