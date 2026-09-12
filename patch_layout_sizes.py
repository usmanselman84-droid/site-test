#!/usr/bin/env python3
"""Layout/size fixes for ty: pin the 716px brand mark, desktop cabinet header, mobile dock."""
from pathlib import Path

ROOT = Path("/opt/sochi-portal-staging")

# --- header-boot: has-bottom-nav only on phones (desktop was hiding header links)
boot = ROOT / "public/brand/header-boot.js"
js = boot.read_text()
old = """    h.classList.remove("is-admin");
    h.classList.add("is-cabinet","yp-cabinet-flow","has-bottom-nav");
    if(b){
      b.classList.remove("is-admin");
      b.classList.add("is-cabinet","has-bottom-nav");
    }"""
new = """    h.classList.remove("is-admin");
    h.classList.add("is-cabinet","yp-cabinet-flow");
    if(b){
      b.classList.remove("is-admin");
      b.classList.add("is-cabinet");
    }
    var phone = window.matchMedia && window.matchMedia("(max-width: 860px)").matches;
    if(phone){
      h.classList.add("has-bottom-nav");
      if(b) b.classList.add("has-bottom-nav");
    } else {
      h.classList.remove("has-bottom-nav");
      if(b) b.classList.remove("has-bottom-nav");
    }"""
if old in js:
    boot.write_text(js.replace(old, new, 1))
    print("OK header-boot: has-bottom-nav only on phone")
elif "has-bottom-nav only on phone" in js or "max-width: 860px" in js and "has-bottom-nav" in js:
    print("skip header-boot (already gated)")
else:
    # try the compacted form after hydration rewrite
    if 'h.classList.add("is-cabinet","yp-cabinet-flow","has-bottom-nav")' in js:
        boot.write_text(js.replace(
            'h.classList.add("is-cabinet","yp-cabinet-flow","has-bottom-nav");',
            'h.classList.add("is-cabinet","yp-cabinet-flow");',
            1,
        ).replace(
            'b.classList.add("is-cabinet","has-bottom-nav");',
            'b.classList.add("is-cabinet");\n      var phone=window.matchMedia&&window.matchMedia("(max-width: 860px)").matches;\n      if(phone){h.classList.add("has-bottom-nav");b.classList.add("has-bottom-nav");} else {h.classList.remove("has-bottom-nav");b.classList.remove("has-bottom-nav");}',
            1,
        ))
        print("OK header-boot compact replace")
    else:
        print("WARN header-boot mark() not patched")
        # show nearby
        idx = js.find("has-bottom-nav")
        print(js[max(0, idx-200):idx+240] if idx>=0 else "no has-bottom-nav")

theme = ROOT / "public/brand/theme.css"
css = theme.read_text()
MARK = "qa-layout-sizes-20260912"
BLOCK = r"""

/* qa-layout-sizes-20260912 — pin the 716×716 brand PNG, restore header/aside/dock */

/* The mark file is 716px. `width:100%; height:100%` + `max-width:none` let it
   spill out of the header and cover the cabinet menu. */
.site-brand-mark,
.site-brand-nav .site-brand-mark,
header.glass-nav .site-brand-mark {
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
  min-height: 36px !important;
  max-width: 36px !important;
  max-height: 36px !important;
  overflow: hidden !important;
  flex: 0 0 36px !important;
}
.site-brand-logo,
img.site-brand-logo,
.site-brand-mark img,
header.glass-nav .site-brand-logo {
  width: 36px !important;
  height: 36px !important;
  max-width: 36px !important;
  max-height: 36px !important;
  object-fit: contain !important;
  display: block !important;
}
.site-brand--footer .site-brand-mark,
.site-brand--footer .site-brand-logo,
.site-brand--footer img.site-brand-logo {
  width: 64px !important;
  height: 64px !important;
  min-width: 64px !important;
  min-height: 64px !important;
  max-width: 64px !important;
  max-height: 64px !important;
}
header.glass-nav,
html.is-cabinet header.glass-nav,
html.yp-cabinet-flow header.glass-nav {
  max-height: 4.75rem !important;
  min-height: 3.6rem !important;
  height: auto !important;
  overflow: visible !important;
  align-items: center !important;
}
.glass-nav-inner {
  min-height: 3.6rem !important;
  height: auto !important;
  max-height: 4.75rem !important;
  overflow: hidden !important;
  align-items: center !important;
}

/* Desktop cabinet: full site header (links + search + chip), no phone dock. */
@media (min-width: 861px) {
  html.is-cabinet .desktop-nav,
  html.yp-cabinet-flow .desktop-nav,
  html.is-cabinet .nav-header-desktop,
  html.is-cabinet .nav-desktop {
    display: flex !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    min-width: 0 !important;
    overflow: hidden !important;
  }
  html.is-cabinet .yp-bottom-nav,
  html.yp-cabinet-flow .yp-bottom-nav,
  html.is-cabinet .yp-bottom-nav-space {
    display: none !important;
  }
  html.is-cabinet,
  html.yp-cabinet-flow,
  body.is-cabinet {
    --yp-bottom-nav-h: 0px !important;
  }
  .dashboard-page.container,
  main.container.dashboard-page {
    max-width: 1240px !important;
    width: 100% !important;
    padding-left: 1.25rem !important;
    padding-right: 1.25rem !important;
    margin-inline: auto !important;
  }
  .dashboard-layout,
  .dashboard-shell {
    display: grid !important;
    grid-template-columns: 240px minmax(0, 1fr) !important;
    gap: 1.35rem !important;
    align-items: start !important;
    width: 100% !important;
  }
  .dashboard-aside--nav,
  aside.dashboard-aside {
    width: 240px !important;
    max-width: 240px !important;
    position: sticky !important;
    top: 5rem !important;
    max-height: calc(100dvh - 6rem) !important;
    overflow: auto !important;
    z-index: 2 !important;
  }
  .dashboard-main {
    min-width: 0 !important;
    max-width: 100% !important;
  }
  html.is-cabinet .main-content,
  html.yp-cabinet-flow .main-content,
  body.is-cabinet .main-content {
    padding-top: 0 !important;
    padding-bottom: 1.5rem !important;
  }
}

@media (max-width: 860px) {
  .site-brand-mark,
  header.glass-nav .site-brand-mark,
  .site-brand-logo,
  img.site-brand-logo {
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    min-height: 40px !important;
    max-width: 40px !important;
    max-height: 40px !important;
  }
  /* Show the dock on phones even if the has-bottom-nav class lagged. */
  .yp-bottom-nav {
    display: grid !important;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    z-index: 1000 !important;
    height: calc(3.55rem + env(safe-area-inset-bottom, 0px)) !important;
    background: #fff !important;
  }
  .home-rail__slide {
    width: min(78vw, 300px) !important;
    flex: 0 0 min(78vw, 300px) !important;
  }
  .lift-hero__cta .btn,
  .lift-hero__btn {
    min-height: 44px !important;
  }
  html.is-cabinet .main-content,
  body.is-cabinet .main-content {
    padding-top: 0 !important;
    padding-bottom: calc(4.15rem + env(safe-area-inset-bottom, 0px)) !important;
  }
}
"""
if MARK in css:
    print("skip theme (marker present)")
else:
    theme.write_text(css + BLOCK)
    print("OK theme layout sizes appended")
print("done")
