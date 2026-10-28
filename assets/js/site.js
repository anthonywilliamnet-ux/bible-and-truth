/* =====================================================================
   Bible & Truth - site script.
   You do not need to edit this file.
   - Settings live in  _config.yml
   - Categories live in  _data/categories.yml
   - Daily verses live in  _data/verses.yml
   - Articles are .md files inside  articles/
   ===================================================================== */
(function () {
  "use strict";

  var BT = window.BT || {};
  var base = BT.base || "";
  var CATS = BT.cats || [];
  var P = BT.perPage || 5;
  var body = document.body;
  var kind = body.getAttribute("data-page") || "page";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function pretty(slug) {
    return String(slug).replace(/[-_]+/g, " ").replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }
  function slugify(s) {
    return String(s).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
  }
  function fmtDate(d) {
    if (!d) return "";
    var p = String(d).split("-");
    if (p.length < 3) return "";
    return MONTHS[(+p[1]) - 1] + " " + (+p[2]) + ", " + p[0];
  }
  function localDay() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5); }
  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }
  function pageUrl(c, s, q) {
    var qs = [];
    if (c) qs.push("c=" + encodeURIComponent(c));
    if (s) qs.push("s=" + encodeURIComponent(s));
    if (q) qs.push("q=" + encodeURIComponent(q));
    return base + "/articles/" + (qs.length ? "?" + qs.join("&") : "");
  }

  /* ---- categories: the ones in _data/categories.yml, plus any folder found in the articles ---- */
  function catInfo(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
    return { id: id, name: pretty(id), icon: "book", desc: "", subs: [] };
  }
  function subInfo(cid, sid) {
    var subs = catInfo(cid).subs || [];
    for (var i = 0; i < subs.length; i++) if (subs[i].id === sid) return subs[i];
    return { id: sid, name: pretty(sid), desc: "" };
  }

  /* ---- the article list (search.json is built by Jekyll from every .md file in articles/) ---- */
  var dataPromise = null;
  function getData() {
    if (dataPromise) return dataPromise;
    dataPromise = fetch(base + "/search.json").then(function (r) {
      if (!r.ok) throw new Error("bad response");
      return r.json();
    }).then(function (list) {
      loaded = true;
      list.forEach(function (a) {
        a.date = a.date || "";
        var cn = catInfo(a.cat).name + " " + (a.sub ? subInfo(a.cat, a.sub).name : "");
        a._ti = norm(a.title);
        a._s = norm(a.summary);
        a._c = norm(cn);
        a._t = norm(a.title + " " + a.summary + " " + a.text + " " + cn);
      });
      list.sort(function (x, y) { return x.date < y.date ? 1 : x.date > y.date ? -1 : (x.title < y.title ? -1 : 1); });
      return list;
    });
    dataPromise.catch(function () { dataPromise = null; });
    return dataPromise;
  }

  var NONWORD;
  try { NONWORD = new RegExp("[^\\p{L}\\p{N}\\s]+", "gu"); } catch (e) { NONWORD = /[^a-z0-9\s]+/g; }
  /* lower-case, remove accents and apostrophes, so  Qur’an = quran  and  café = cafe  */
  function norm(x) {
    x = String(x == null ? "" : x).toLowerCase();
    if (x.normalize) x = x.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return x.replace(/['’‘`´]/g, "").replace(NONWORD, " ").replace(/\s+/g, " ").trim();
  }
  function startsWord(hay, w) { return (" " + hay).indexOf(" " + w) > -1; }

  /* every word typed must be found; title matches rank first */
  function search(list, q) {
    var words = norm(q).split(" ").filter(Boolean);
    if (!words.length) return list;
    var phrase = words.join(" "), hits = [];
    list.forEach(function (a) {
      var score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i], s = 0;
        if (startsWord(a._ti, w)) s = 6;
        else if (w.length > 2 && a._ti.indexOf(w) > -1) s = 4;
        else if (startsWord(a._s, w)) s = 3;
        else if (startsWord(a._c, w)) s = 2;
        else if (startsWord(a._t, w)) s = 1;
        else if (w.length > 3 && a._t.indexOf(w) > -1) s = 1;
        if (!s) return;
        score += s;
      }
      if (a._ti.indexOf(phrase) > -1) score += 5;
      hits.push({ a: a, s: score });
    });
    hits.sort(function (x, y) { return y.s - x.s || (x.a.date < y.a.date ? 1 : x.a.date > y.a.date ? -1 : 0); });
    return hits.map(function (h) { return h.a; });
  }

  /* wrap the typed words in <mark> (safe: the text is escaped piece by piece) */
  function mark(text, q) {
    var ws = String(q).toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; })
      .map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); });
    if (!ws.length) return esc(text);
    return String(text).split(new RegExp("(" + ws.join("|") + ")", "i")).map(function (p, i) {
      return i % 2 ? "<mark>" + esc(p) + "</mark>" : esc(p);
    }).join("");
  }

  var articlesHook = null; /* set on the Articles page so every search box filters that list live */

  function card(a) {
    var c = catInfo(a.cat);
    var meta = [a.author, fmtDate(a.date), a.words ? Math.max(1, Math.ceil(a.words / 200)) + " min read" : ""].filter(Boolean).join(" · ");
    return '<article class="card"><div class="cb"><span class="tag">' + esc(c.name) + '</span>' +
      '<h3><a href="' + esc(a.url) + '">' + esc(a.title) + '</a></h3><p>' + esc(a.summary) + '</p>' +
      '<div class="meta">' + esc(meta) + '</div></div></article>';
  }

  /* ---- light / dark theme ---- */
  var root = document.documentElement, tb = $("#theme"), metaTheme = $('meta[name="theme-color"]');
  function systemTheme() { return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
  function paintTheme(t) {
    root.setAttribute("data-theme", t);
    if (metaTheme) metaTheme.setAttribute("content", t === "dark" ? "#0d1626" : "#ffffff");
    if (tb) {
      var label = t === "dark" ? "Switch to light theme" : "Switch to dark theme";
      tb.setAttribute("aria-label", label);
      tb.setAttribute("title", label);
    }
  }
  function saved() { try { var v = localStorage.getItem("bt-theme"); return v === "light" || v === "dark" ? v : null; } catch (e) { return null; } }
  paintTheme(root.getAttribute("data-theme") || saved() || systemTheme());
  if (tb) tb.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.classList.add("theme-anim");
    paintTheme(next);
    try { localStorage.setItem("bt-theme", next); } catch (e) { /* private mode: ignore */ }
    setTimeout(function () { root.classList.remove("theme-anim"); }, 400);
  });
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var follow = function () { if (!saved()) paintTheme(systemTheme()); };
    if (mq.addEventListener) mq.addEventListener("change", follow); else if (mq.addListener) mq.addListener(follow);
  }

  /* ---- search boxes: header dropdown, Articles page ---- */
  var hs = $("#hs"), sres = $("#sres"), sclr = $("#sclr");
  var qInputs = $$('input[name="q"]');
  var aqBox = $("#aq");
  if (aqBox) qInputs.push(aqBox);
  var loaded = false, seq = 0, act = -1;

  function syncInputs(v, except) {
    qInputs.forEach(function (i) { if (i !== except && i.value !== v) i.value = v; });
    if (sclr && hs) sclr.hidden = !hs.value;
  }
  function closeRes() {
    if (!sres) return;
    sres.hidden = true; act = -1;
    hs.setAttribute("aria-expanded", "false");
    hs.removeAttribute("aria-activedescendant");
  }
  function openRes(html) {
    sres.innerHTML = html; sres.hidden = false; act = -1;
    hs.setAttribute("aria-expanded", "true");
    hs.removeAttribute("aria-activedescendant");
  }
  function setAct(n) {
    var items = $$("a", sres);
    if (!items.length) return;
    act = (n + items.length) % items.length;
    items.forEach(function (a, i) { a.classList.toggle("act", i === act); a.setAttribute("aria-selected", i === act ? "true" : "false"); });
    hs.setAttribute("aria-activedescendant", items[act].id);
    if (items[act].scrollIntoView) items[act].scrollIntoView({ block: "nearest" });
  }
  function runSearch() {
    var q = hs.value.trim();
    if (sclr) sclr.hidden = !hs.value;
    if (kind === "articles") return;                 /* the list on this page filters live instead */
    if (q.length < 2) { closeRes(); return; }
    var mine = ++seq;
    if (!loaded) openRes('<div class="none">Searching…</div>');
    getData().then(function (all) {
      if (mine !== seq) return;
      var m = search(all, q);
      var html = m.slice(0, 6).map(function (a, i) {
        return '<a role="option" id="sr' + i + '" href="' + esc(a.url) + '"><b>' + mark(a.title, q) + '</b>' +
          '<span>' + mark(a.summary, q) + '</span>' +
          '<small>' + esc(catInfo(a.cat).name) + (a.date ? " · " + esc(fmtDate(a.date)) : "") + '</small></a>';
      }).join("");
      if (!m.length) html = '<div class="none">No articles found for “' + esc(q) + '”. Try a shorter word such as “Jesus”, “David” or “Islam”.</div>';
      else html += '<a role="option" id="sr' + Math.min(m.length, 6) + '" class="all" href="' + esc(pageUrl("", "", q)) + '">See all ' + plural(m.length, "result") + ' →</a>';
      openRes(html);
    }).catch(function () {
      if (mine !== seq) return;
      openRes('<div class="none">Search could not load. Try the <a href="' + esc(base + "/articles/") + '">Articles page</a>.</div>');
    });
  }

  if (hs && sres) {
    hs.addEventListener("input", function () { syncInputs(hs.value, hs); runSearch(); });
    hs.addEventListener("focus", function () { getData().catch(function () {}); if (hs.value.trim().length > 1) runSearch(); });
    hs.addEventListener("click", function () { if (sres.hidden && hs.value.trim().length > 1) runSearch(); });
    hs.addEventListener("keydown", function (e) {
      var open = !sres.hidden;
      if (e.key === "ArrowDown" && open) { e.preventDefault(); setAct(act + 1); }
      else if (e.key === "ArrowUp" && open) { e.preventDefault(); setAct(act < 0 ? -1 : act - 1); }
      else if (e.key === "Enter" && open && act > -1) { e.preventDefault(); var a = $$("a", sres)[act]; if (a) window.location.href = a.href; }
      else if (e.key === "Escape") {
        if (open) { e.preventDefault(); closeRes(); }   /* first Esc closes the list (and keeps the text) */
        else if (hs.value) { hs.value = ""; syncInputs("", hs); if (articlesHook) articlesHook("", hs); }
      }
    });
    document.addEventListener("click", function (e) { if (!hs.form.contains(e.target)) closeRes(); });
    document.addEventListener("keydown", function (e) {      /* press / anywhere to search */
      var t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); hs.focus(); hs.select(); }
    });
    if (sclr) sclr.addEventListener("click", function () {
      hs.value = ""; syncInputs("", hs); closeRes(); hs.focus();
      if (articlesHook) articlesHook("", hs);
    });
  }
  /* on the Articles page every search box (header and filter box) filters the list as you type */
  qInputs.forEach(function (inp) {
    if (inp === hs) return;
    inp.addEventListener("input", function () { syncInputs(inp.value, inp); if (articlesHook) articlesHook(inp.value, inp); });
  });
  if (hs) hs.addEventListener("input", function () { if (articlesHook) articlesHook(hs.value, hs); });
  $$('form[role="search"]').forEach(function (f) {
    f.addEventListener("submit", function (e) {
      var inp = $('input[name="q"]', f);
      if (articlesHook && inp) { e.preventDefault(); articlesHook(inp.value, inp); closeRes(); if (inp.blur && inp !== hs) inp.blur(); }
    });
  });

  /* ---- active item in the top menu ---- */
  function setNav(which, fallback) {
    var links = $$("nav a[data-nav]"), on = null;
    links.forEach(function (a) { if (a.getAttribute("data-nav") === which) on = a; });
    if (!on) links.forEach(function (a) { if (a.getAttribute("data-nav") === fallback) on = a; });
    links.forEach(function (a) { a.classList.remove("on"); });
    if (on) on.classList.add("on");
  }
  if (kind === "home" || kind === "about" || kind === "contact" || kind === "articles") setNav(kind);

  /* ---- breadcrumbs ---- */
  function crumbs(c, s, last) {
    var el = $("#crumbs");
    if (!el) return;
    var t = '<a href="' + base + '/">Home</a> › <a href="' + base + '/articles/">Articles</a>';
    if (c) t += " › " + (s || last ? '<a href="' + esc(pageUrl(c)) + '">' + esc(catInfo(c).name) + "</a>" : esc(catInfo(c).name));
    if (s) t += " › " + (last ? '<a href="' + esc(pageUrl(c, s)) + '">' + esc(subInfo(c, s).name) + "</a>" : esc(subInfo(c, s).name));
    el.className = "crumbs";
    el.innerHTML = t;
  }

  /* ---- a list with "More articles" / "Show less" ---- */
  var lister = (function () {
    var box = $("#cards");
    if (!box) return null;
    var items = [], n = P, emptyMsg = null;
    var info = $("#info"), more = $("#more"), less = $("#less"), empty = $("#empty");
    function render() {
      var k = Math.min(n, items.length);
      box.innerHTML = items.slice(0, k).map(card).join("");
      if (empty) {
        empty.hidden = items.length > 0;
        if (!items.length && emptyMsg) empty.textContent = emptyMsg();
      }
      if (info) info.textContent = items.length ? "Showing " + k + " of " + plural(items.length, "article") : "";
      if (more) more.hidden = k >= items.length;
      if (less) less.hidden = !(n > P && items.length > P);
    }
    if (more) more.onclick = function () { n += P; render(); };
    if (less) less.onclick = function () { n = P; render(); box.scrollIntoView(); };
    return {
      set: function (list, msg) { items = list; emptyMsg = msg || null; n = P; render(); },
      fail: function () {
        box.innerHTML = '<p class="note">The article list could not be loaded. If you opened this file straight from your computer, publish the site or run it with <code>jekyll serve</code>; the list needs a web server.</p>';
        if (info) info.textContent = "";
        if (more) more.hidden = true;
        if (less) less.hidden = true;
      }
    };
  })();

  /* ---- sidebar category counts ---- */
  function showCounts(all) {
    var counts = {};
    all.forEach(function (a) { counts[a.cat] = (counts[a.cat] || 0) + 1; });
    $$("[data-count]").forEach(function (el) {
      var k = counts[el.getAttribute("data-count")] || 0;
      el.textContent = plural(k, "article");
    });
  }

  /* ---- home page ---- */
  if (kind === "home" && lister) {
    getData().then(function (all) { showCounts(all); lister.set(all); }).catch(function () { lister.fail(); });
  }

  /* ---- Articles page: category and subcategory filters + search ---- */
  if (kind === "articles" && lister) {
    var params = new URLSearchParams(location.search);
    var st = { c: params.get("c") || "", s: params.get("s") || "", q: params.get("q") || "" };
    var renderList = null;
    markTag(st.c);
    if (typeof tagToActive === "function") setTimeout(tagToActive, 0);
    syncInputs(st.q);
    articlesHook = function (v, src) {
      st.q = String(v).trim();
      syncInputs(v, src);
      history.replaceState(null, "", pageUrl(st.c, st.s, st.q));
      if (renderList) renderList();
    };

    getData().then(function (all) {
      showCounts(all);

      var render = function () {
        var inCat = all.filter(function (a) { return !st.c || a.cat === st.c; });
        var list = inCat.filter(function (a) { return !st.s || a.sub === st.s; });
        if (st.q) list = search(list, st.q);

        /* heading */
        var title = st.s ? subInfo(st.c, st.s).name : st.c ? catInfo(st.c).name : "All Articles";
        if (st.q) title = "Search results";
        $("#listtitle").textContent = title;
        var lead = st.s ? subInfo(st.c, st.s).desc : st.c ? catInfo(st.c).desc : "";
        if (st.q) lead = "Results for “" + st.q + "”" + (st.c ? " in " + (st.s ? subInfo(st.c, st.s).name : catInfo(st.c).name) : "") + ".";
        $("#listlead").textContent = lead || "";
        $("#listlead").hidden = !lead;

        /* category chips: configured categories that have articles, then any extra folders */
        var counts = {}, order = [];
        all.forEach(function (a) { counts[a.cat] = (counts[a.cat] || 0) + 1; });
        CATS.forEach(function (c) { if (counts[c.id] || c.id === st.c) order.push(c.id); });
        Object.keys(counts).forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });
        var chips = '<a class="chip' + (!st.c ? " on" : "") + '" href="' + esc(pageUrl()) + '" data-c="">All<em>' + all.length + "</em></a>";
        order.forEach(function (id) {
          chips += '<a class="chip' + (st.c === id ? " on" : "") + '" href="' + esc(pageUrl(id)) + '" data-c="' + esc(id) + '">' + esc(catInfo(id).name) + "<em>" + (counts[id] || 0) + "</em></a>";
        });
        $("#chips").innerHTML = chips;

        /* subcategory chips */
        var sc = $("#subchips"), sh = "";
        if (st.c) {
          var sCounts = {}, sOrder = [];
          inCat.forEach(function (a) { if (a.sub) sCounts[a.sub] = (sCounts[a.sub] || 0) + 1; });
          (catInfo(st.c).subs || []).forEach(function (x) { if (sCounts[x.id] || x.id === st.s) sOrder.push(x.id); });
          Object.keys(sCounts).forEach(function (id) { if (sOrder.indexOf(id) < 0) sOrder.push(id); });
          if (sOrder.length) {
            sh = '<a class="chip sub' + (!st.s ? " on" : "") + '" href="' + esc(pageUrl(st.c)) + '" data-c="' + esc(st.c) + '" data-s="">Everything<em>' + inCat.length + "</em></a>";
            sOrder.forEach(function (id) {
              sh += '<a class="chip sub' + (st.s === id ? " on" : "") + '" href="' + esc(pageUrl(st.c, id)) + '" data-c="' + esc(st.c) + '" data-s="' + esc(id) + '">' + esc(subInfo(st.c, id).name) + "<em>" + (sCounts[id] || 0) + "</em></a>";
            });
          }
        }
        sc.innerHTML = sh;
        sc.hidden = !sh;

        crumbs(st.c, st.s, false);
        setNav("cat:" + st.c, "articles");
        document.title = (st.q ? "Search results" : title) + " | Bible & Truth";
        lister.set(list, function () {
          if (st.q) return "No articles match “" + st.q + "”. Try a shorter word such as “Jesus”, “David” or “Islam”.";
          return "No articles in " + (st.s ? subInfo(st.c, st.s).name : st.c ? catInfo(st.c).name : "this list") + " yet. Please check back soon.";
        });
      };

      var go = function (c, s, push) {
        st.c = c; st.s = s;
        if (push) history.pushState(null, "", pageUrl(st.c, st.s, st.q));
        render();
      };
      var onClick = function (e) {
        var a = e.target.closest ? e.target.closest("a.chip") : null;
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        go(a.getAttribute("data-c") || "", a.getAttribute("data-s") || "", true);
      };
      $("#chips").addEventListener("click", onClick);
      $("#subchips").addEventListener("click", onClick);
      window.addEventListener("popstate", function () {
        var p = new URLSearchParams(location.search);
        st.c = p.get("c") || ""; st.s = p.get("s") || ""; st.q = p.get("q") || "";
        syncInputs(st.q);
        markTag(st.c);
        render();
      });
      renderList = render;
      render();
    }).catch(function () { lister.fail(); });
  }

  /* ---- an article page: crumbs, tag, related articles ---- */
  if (kind === "article") {
    var ac = body.getAttribute("data-cat") || "", as = body.getAttribute("data-sub") || "", here = body.getAttribute("data-url");
    crumbs(ac, as, true);
    var tag = $("#atag");
    if (tag) tag.textContent = catInfo(ac).name;
    setNav("cat:" + ac, "articles");
    getData().then(function (all) {
      var same = all.filter(function (a) { return a.url !== here && a.cat === ac; });
      var sub = same.filter(function (a) { return as && a.sub === as; });
      var pick = (sub.length ? sub : same).slice(0, 3);
      var rel = $("#related");
      if (!rel || !pick.length) return;
      rel.innerHTML = '<h2 class="sub-h">More in ' + esc(sub.length ? subInfo(ac, as).name : catInfo(ac).name) + '</h2><div class="cards">' + pick.map(card).join("") + "</div>";
      rel.hidden = false;
    }).catch(function () { /* related articles are optional */ });
  }

  /* ---- tag bar under the header: highlight the current topic ---- */
  function markTag(c) { $$(".tagbar a").forEach(function (a) { a.classList.toggle("on", a.getAttribute("data-tag") === (c || "")); }); }
  if (kind !== "articles") markTag("");

  /* topic bar: swipe, drag, mouse wheel or the arrow buttons move it sideways */
  var tw = $("#tags"), tPrev = $(".tb-btn.prev"), tNext = $(".tb-btn.next");
  function tagArrows() {
    if (!tw || !tPrev || !tNext) return;
    tPrev.hidden = tw.scrollLeft < 4;
    tNext.hidden = tw.scrollLeft + tw.clientWidth >= tw.scrollWidth - 4;
  }
  function tagToActive() {
    var on = tw && tw.querySelector("a.on");
    if (on) tw.scrollLeft = Math.max(0, on.offsetLeft - 64);
    tagArrows();
  }
  if (tw) {
    tPrev.addEventListener("click", function () { tw.scrollBy({ left: -tw.clientWidth * 0.7, behavior: "smooth" }); });
    tNext.addEventListener("click", function () { tw.scrollBy({ left: tw.clientWidth * 0.7, behavior: "smooth" }); });
    tw.addEventListener("scroll", tagArrows, { passive: true });
    window.addEventListener("resize", tagArrows);
    tw.addEventListener("wheel", function (e) {            /* wheel over the bar moves it sideways */
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || tw.scrollWidth <= tw.clientWidth) return;
      var atEnd = (e.deltaY > 0 && tw.scrollLeft + tw.clientWidth >= tw.scrollWidth - 1) || (e.deltaY < 0 && tw.scrollLeft <= 0);
      if (atEnd) return;
      e.preventDefault(); tw.scrollLeft += e.deltaY;
    }, { passive: false });
    var dragX = null, startLeft = 0, moved = false;          /* click and drag with a mouse */
    tw.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") return; dragX = e.clientX; startLeft = tw.scrollLeft; moved = false; });
    window.addEventListener("pointermove", function (e) {
      if (dragX === null) return;
      var dx = e.clientX - dragX;
      if (!moved && Math.abs(dx) > 5) { moved = true; tw.classList.add("drag"); }
      if (moved) tw.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", function () { dragX = null; setTimeout(function () { tw.classList.remove("drag"); }, 0); });
    window.addEventListener("load", tagToActive);
    tagArrows();
  }

  /* ---- every page: skip link target and back-to-top button ---- */
  var mainEl = $("main");
  if (mainEl && !mainEl.id) mainEl.id = "main";
  var up = document.createElement("button");
  up.className = "totop"; up.type = "button"; up.hidden = true;
  up.setAttribute("aria-label", "Back to top"); up.setAttribute("title", "Back to top");
  up.innerHTML = '<svg aria-hidden="true"><use href="#arrow"/></svg>';
  up.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  document.body.appendChild(up);
  var prog = $("#prog");
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    up.hidden = y < 600;
    if (prog) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- article page: contents list (3+ headings) and share buttons ---- */
  if (kind === "article") {
    var heads = $$(".page h2");
    if (heads.length >= 3) {
      var li = heads.map(function (h) {
        if (!h.id) h.id = slugify(h.textContent) || "section";
        return '<li><a href="#' + esc(h.id) + '">' + esc(h.textContent) + "</a></li>";
      }).join("");
      var toc = document.createElement("nav");
      toc.className = "toc"; toc.setAttribute("aria-label", "In this article");
      toc.innerHTML = "<b>In this article</b><ol>" + li + "</ol>";
      heads[0].parentNode.insertBefore(toc, heads[0]);
    }
    var sh = $("#share"), wa = $("#sh-wa"), cp = $("#sh-cp");
    if (sh && wa && cp) {
      var title = $(".page h1") ? $(".page h1").textContent : document.title;
      wa.href = "https://wa.me/?text=" + encodeURIComponent(title + " " + location.href.split("#")[0]);
      cp.addEventListener("click", function () {
        var url = location.href.split("#")[0], done = function () { cp.textContent = "Link copied ✓"; setTimeout(function () { cp.textContent = "Copy link"; }, 2000); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt("Copy this link:", url); });
        else window.prompt("Copy this link:", url);
      });
      sh.hidden = false;
    }
  }

  /* ---- daily verse (changes at midnight, your local time) ---- */
  var V = BT.verses || [];
  if ($("#vt") && V.length) {
    var vi = localDay() % V.length;
    var showVerse = function () { $("#vt").textContent = V[vi].text; $("#vr").textContent = V[vi].ref; };
    showVerse();
    if ($("#vb")) $("#vb").onclick = function () { vi = (vi + 1) % V.length; showVerse(); };
  }

  /* ---- contact form ---- */
  var cf = $("#cf");
  if (cf) cf.addEventListener("submit", function (e) {
    e.preventDefault();
    var wa = e.submitter && e.submitter.getAttribute("data-m") === "w";
    var text = cf.n.value + ": " + cf.m.value;
    if (wa) window.open("https://wa.me/" + BT.whatsapp + "?text=" + encodeURIComponent(text), "_blank");
    else window.location.href = "mailto:" + BT.email + "?subject=" + encodeURIComponent("Message from " + cf.n.value) + "&body=" + encodeURIComponent(cf.m.value);
  });
})();
