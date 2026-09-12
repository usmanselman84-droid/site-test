#!/usr/bin/env python3
"""Stop header-boot from stampeding /api/user/profile (caused 503 via limit_conn)."""
from pathlib import Path

BOOT = Path("/opt/sochi-portal-staging/public/brand/header-boot.js")
js = BOOT.read_text()

SINGLETON = r'''
  window.ypLoadProfile = window.ypLoadProfile || function(){
    if(window.__ypProfileInflight) return window.__ypProfileInflight;
    if(window.__ypProfile && (Date.now()-(window.__ypProfileAt||0)) < 60000){
      return Promise.resolve(window.__ypProfile);
    }
    if(window.__ypProfileFailUntil && Date.now() < window.__ypProfileFailUntil){
      return Promise.resolve(window.__ypProfile || null);
    }
    var authed = false;
    try{ authed = localStorage.getItem("yp-session")==="1"; }catch(e){}
    if(!authed && !document.documentElement.classList.contains("has-session")){
      return Promise.resolve(null);
    }
    window.__ypProfileInflight = fetch("/api/user/profile",{credentials:"same-origin"}).then(function(r){
      if(r.status>=500){ window.__ypProfileFailUntil = Date.now()+30000; return null; }
      if(r.status===401 || r.status===403) return null;
      return r.ok ? r.json() : null;
    }).then(function(p){
      window.__ypProfile = p || null;
      window.__ypProfileAt = Date.now();
      return window.__ypProfile;
    }).catch(function(){
      window.__ypProfileFailUntil = Date.now()+15000;
      return null;
    }).then(function(p){
      window.__ypProfileInflight = null;
      return p;
    });
    return window.__ypProfileInflight;
  };
'''

if "window.ypLoadProfile" not in js:
    needle = "  window.ypHasSession = function(){"
    if needle not in js:
        raise SystemExit("ypHasSession not found")
    js = js.replace(needle, SINGLETON + "\n" + needle, 1)
    print("OK inserted ypLoadProfile")
else:
    print("skip singleton (exists)")

# Chip painter: fetch via singleton; observer must NOT refetch
old_run = '''  function run(){
    try{
      if(!isAuthed()){
        apply(null);
        return;
      }
      fetch("/api/user/profile",{credentials:"same-origin"}).then(function(r){
        return r.ok?r.json():null;
      }).then(function(p){ apply(p); }).catch(function(){ apply(null); });
    }catch(e){ apply(null); }
  }
  function boot(){ if(window.ypAfterHydration) window.ypAfterHydration(run); else run(); }
  window.ypAfterHydration(boot);
  setTimeout(function(){ window.ypAfterHydration(boot); }, 400);
  setTimeout(function(){ window.ypAfterHydration(boot); }, 1400);
  var mo=window.ypGuardObserver(function(){
    document.querySelectorAll(".nav-account-trigger, .nav-auth-mobile__profile").forEach(hideLucide);
    if(!document.querySelector(".nav-profile-chip")) run();
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
'''
new_run = '''  function run(){
    try{
      if(!isAuthed()){ apply(null); return; }
      window.ypLoadProfile().then(function(p){ apply(p); });
    }catch(e){ apply(null); }
  }
  function boot(){ if(window.ypAfterHydration) window.ypAfterHydration(run); else run(); }
  window.ypAfterHydration(boot);
  var mo=window.ypGuardObserver(function(){
    document.querySelectorAll(".nav-account-trigger, .nav-auth-mobile__profile").forEach(hideLucide);
    if(!document.querySelector(".nav-profile-chip") && isAuthed()){
      apply(window.__ypProfile || null);
    }
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
'''
if old_run in js:
    js = js.replace(old_run, new_run, 1)
    print("OK chip run() de-looped")
else:
    print("WARN chip run() pattern mismatch")

old_card = '''  function run(){
    if(!window.ypHasSession || !window.ypHasSession()) return;
    fetch("/api/user/profile",{credentials:"same-origin"}).then(function(r){
      return r.ok?r.json():null;
    }).then(function(p){ paintCard(p||{}); }).catch(function(){ paintCard({}); });
  }
  function boot(){ if(window.ypAfterHydration) window.ypAfterHydration(run); else run(); }
  window.ypAfterHydration(boot);
  setTimeout(function(){ window.ypAfterHydration(boot); }, 600);
  var mo=window.ypGuardObserver(function(){
    if(document.querySelector(".nav-profile-card__avatar") && !document.querySelector(".nav-profile-card__avatar .nav-avatar-photo, .nav-profile-card__avatar .nav-profile-chip__mark")) run();
  });
'''
new_card = '''  function run(){
    if(!window.ypHasSession || !window.ypHasSession()) return;
    window.ypLoadProfile().then(function(p){ paintCard(p||{}); });
  }
  function boot(){ if(window.ypAfterHydration) window.ypAfterHydration(run); else run(); }
  window.ypAfterHydration(boot);
  var mo=window.ypGuardObserver(function(){
    if(document.querySelector(".nav-profile-card__avatar") && !document.querySelector(".nav-profile-card__avatar .nav-avatar-photo, .nav-profile-card__avatar .nav-profile-chip__mark")){
      paintCard(window.__ypProfile || {});
    }
  });
'''
if old_card in js:
    js = js.replace(old_card, new_card, 1)
    print("OK card run() de-looped")
else:
    print("WARN card run() pattern mismatch")

if "fetch(\"/api/user/profile\"" in js:
    print("WARN leftover raw profile fetch still present")
else:
    print("OK no raw profile fetches")

BOOT.write_text(js)
print("wrote", BOOT, "bytes", len(js))

# fetch-guard: first script in <head>, protects even cached header-boot.js?v=22
guard = Path("/opt/sochi-portal-staging/public/brand/fetch-guard.js")
guard.write_text(r"""/* Caps /api/user/profile so a cached header-boot.js cannot 503 the origin. */
(function(){
  var orig = window.fetch;
  var inflight = null;
  var lastAt = 0;
  var failUntil = 0;
  window.fetch = function(input, init){
    var url = "";
    try{ url = typeof input === "string" ? input : (input && input.url) || ""; }catch(e){}
    if(url.indexOf("/api/user/profile") === -1) return orig.apply(this, arguments);
    var now = Date.now();
    if(failUntil && now < failUntil) return Promise.resolve(new Response("{}", {status:200, headers:{"Content-Type":"application/json"}}));
    if(inflight) return inflight;
    if(now - lastAt < 8000) return Promise.resolve(new Response("{}", {status:200, headers:{"Content-Type":"application/json"}}));
    lastAt = now;
    inflight = orig.apply(this, arguments).then(function(r){
      if(r && r.status >= 500) failUntil = Date.now() + 30000;
      return r;
    }).catch(function(e){
      failUntil = Date.now() + 15000;
      throw e;
    }).then(function(r){ inflight = null; return r; }, function(e){ inflight = null; throw e; });
    return inflight;
  };
})();
""")
print("OK wrote fetch-guard.js")
