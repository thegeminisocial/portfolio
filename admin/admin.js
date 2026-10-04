/* =====================================================================
   THE GEMINI SOCIAL: ADMIN DASHBOARD
   Plain JavaScript, no framework. Reads and writes your Supabase tables.
   Each tab is drawn by its own function further down (renderPortfolio,
   renderLeads, renderClients, renderCalendar, renderResults,
   renderChecklists, renderNumbers).
   If a table is missing, that tab says so and everything else carries on.
   ===================================================================== */
(function () {
  "use strict";

  var OWNER_EMAIL = "thegeminisocialco@gmail.com";
  var db = window.db;

  /* ---------------------------------------------------------------
     Small helpers
     --------------------------------------------------------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(v) {
    return String(v === null || v === undefined ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function plural(n, word, many) { return n + " " + (n === 1 ? word : (many || word + "s")); }
  function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  function fmtNum(v) { return n(v).toLocaleString("en-AU"); }
  var AUD = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
  function money(v) { return AUD.format(n(v)); }

  // Dates: always shown as DD/MM/YYYY, stored as YYYY-MM-DD
  function pad(x) { return String(x).padStart(2, "0"); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function todayDate() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function today() { return iso(todayDate()); }
  function parseDate(s) {
    if (!s) return null;
    s = String(s);
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    var d = new Date(s);
    if (isNaN(d)) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function fmtDate(s) { var d = parseDate(s); return d ? pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() : ""; }
  function addDays(d, k) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + k); }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
  function monthStart(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-01"; }
  function monthOf(s) { var d = parseDate(s); return d ? monthStart(d) : ""; }
  function shiftMonth(m, k) { var d = parseDate(m); return monthStart(new Date(d.getFullYear(), d.getMonth() + k, 1)); }
  function monthLabel(m) { var d = parseDate(m); return d ? d.toLocaleDateString("en-AU", { month: "long", year: "numeric" }) : ""; }
  function monthShort(m) { var d = parseDate(m); return d ? d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" }) : ""; }
  function thisMonth() { return monthStart(todayDate()); }

  // Change against the previous value, never dividing by zero
  function change(cur, prev) {
    if (prev === null || prev === undefined) return null;
    var diff = n(cur) - n(prev);
    var pct = n(prev) !== 0 ? (diff / n(prev)) * 100 : null;
    return { diff: diff, pct: pct };
  }
  function changeText(c) {
    if (!c) return "";
    if (c.diff === 0) return "no change";
    var sign = c.diff > 0 ? "+" : "-";
    var txt = sign + fmtNum(Math.abs(c.diff));
    if (c.pct !== null) txt += " (" + sign + Math.abs(c.pct).toFixed(1) + "%)";
    else txt += " (new)";
    return txt;
  }
  function changeHTML(c) {
    if (!c) return "";
    var cls = c.diff > 0 ? "up" : c.diff < 0 ? "down" : "flat";
    var arrow = c.diff > 0 ? "&#9650; " : c.diff < 0 ? "&#9660; " : "";
    return '<span class="change ' + cls + '">' + arrow + esc(changeText(c)) + "</span>";
  }

  /* ---------------------------------------------------------------
     Icons (line icons, no emoji)
     --------------------------------------------------------------- */
  var ICON = {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path class="star-shape" d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
    grip: '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" style="width:12px;height:12px"><path d="M4 20l1.3-4A8 8 0 1 1 8 19z"/></svg>'
  };

  /* ---------------------------------------------------------------
     Messages: notices at the top, and a small toast at the bottom
     --------------------------------------------------------------- */
  var notices = {};
  function notice(key, html, kind) { notices[key] = { html: html, kind: kind || "" }; drawNotices(); }
  function clearNotices() { notices = {}; drawNotices(); }
  function drawNotices() {
    $("#notices").innerHTML = Object.keys(notices).map(function (k) {
      var x = notices[k];
      return '<div class="notice ' + x.kind + '">' + x.html + "</div>";
    }).join("");
  }
  var toastTimer;
  function toast(msg, isError) {
    var t = $("#toast");
    t.textContent = msg;
    t.className = "toast show" + (isError ? " error" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = "toast"; }, 2600);
  }

  /* ---------------------------------------------------------------
     Talking to the database, safely
     --------------------------------------------------------------- */
  function explain(error, table) {
    var code = (error && error.code) || "";
    var msg = (error && error.message) || "";
    if (code === "PGRST205" || code === "42P01" || /could not find the table/i.test(msg) || (/relation/i.test(msg) && /does not exist/i.test(msg))) {
      notice("missing-" + table, "<strong>The \"" + esc(table) + "\" table is missing.</strong>&nbsp;This part can't show its data until it exists. Open Supabase, go to SQL Editor and run " + (table === "inspiration" ? "db-inspiration.sql" : "db.sql") + " to create it. Everything else keeps working.");
      return "missing";
    }
    if (code === "PGRST204" || code === "42703" || /column/i.test(msg)) {
      notice("field-" + table, "<strong>A field is missing in \"" + esc(table) + "\".</strong>&nbsp;" + esc(msg) + ". Run db.sql again in Supabase to add it. The rest keeps working.");
      return "field";
    }
    if (/jwt|token|auth/i.test(msg)) {
      notice("auth", "<strong>Your session has expired.</strong>&nbsp;Please sign out and sign in again.", "error");
      return "auth";
    }
    if (/fetch|network|failed/i.test(msg)) {
      notice("net", "<strong>We couldn't reach the database.</strong>&nbsp;Check your internet connection, then refresh the page.", "error");
      return "network";
    }
    notice("err-" + table, "<strong>Something went wrong loading \"" + esc(table) + "\".</strong>&nbsp;" + esc(msg), "error");
    return "error";
  }

  // Read a table. Always resolves, never throws: { rows, ok }
  function read(table, build) {
    try {
      var q = db.from(table).select("*");
      if (build) q = build(q);
      return Promise.resolve(q).then(function (res) {
        if (res.error) { explain(res.error, table); return { rows: [], ok: false }; }
        return { rows: res.data || [], ok: true };
      }, function (e) { explain(e, table); return { rows: [], ok: false }; });
    } catch (e) { explain(e, table); return Promise.resolve({ rows: [], ok: false }); }
  }
  // Read a big table in pages of 1000 (used for visits)
  function readAll(table, build) {
    var all = [];
    function page(from) {
      return read(table, function (q) { q = build ? build(q) : q; return q.range(from, from + 999); }).then(function (res) {
        if (!res.ok) return { rows: all, ok: false };
        all = all.concat(res.rows);
        if (res.rows.length === 1000 && from < 50000) return page(from + 1000);
        return { rows: all, ok: true };
      });
    }
    return page(0);
  }
  // Write to a table. Resolves true or false, and tells you why it failed
  function write(promiseLike, table, okMsg) {
    return Promise.resolve(promiseLike).then(function (res) {
      if (res && res.error) {
        var kind = explain(res.error, table);
        toast(kind === "missing" ? "That table is missing, see the note at the top." : "Couldn't save: " + (res.error.message || "please try again"), true);
        return false;
      }
      if (okMsg) toast(okMsg);
      return true;
    }, function (e) { explain(e, table); toast("Couldn't save, please try again.", true); return false; });
  }

  /* ---------------------------------------------------------------
     Pop-up form, used by every tab
     --------------------------------------------------------------- */
  var lastFocus = null;
  function closeModal() {
    $("#modal").hidden = true;
    $("#modal-body").innerHTML = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function openModal(title, html) {
    lastFocus = document.activeElement;
    $("#modal-title").textContent = title;
    $("#modal-body").innerHTML = html;
    $("#modal").hidden = false;
    var first = $("#modal-body input, #modal-body select, #modal-body textarea, #modal-body button");
    if (first) setTimeout(function () { first.focus(); }, 30);
  }
  function fieldHTML(f, value) {
    var id = "f-" + f.name;
    var full = f.full || f.type === "textarea" ? " full" : "";
    var req = f.required ? " required" : "";
    var help = f.help ? '<span class="help">' + esc(f.help) + "</span>" : "";
    if (f.type === "checkbox") {
      return '<div class="field checkbox' + full + '"><input type="checkbox" id="' + id + '" name="' + f.name + '"' + (value ? " checked" : "") + '><label for="' + id + '">' + esc(f.label) + "</label></div>";
    }
    var label = '<label for="' + id + '">' + esc(f.label) + (f.required ? " *" : "") + "</label>";
    if (f.type === "select") {
      var opts = (f.options || []).map(function (o) {
        var v = typeof o === "object" ? o.value : o, l = typeof o === "object" ? o.label : o;
        return '<option value="' + esc(v) + '"' + (String(value === null || value === undefined ? "" : value) === String(v) ? " selected" : "") + ">" + esc(l) + "</option>";
      }).join("");
      return '<div class="field' + full + '">' + label + '<select id="' + id + '" name="' + f.name + '"' + req + ">" + opts + "</select>" + help + "</div>";
    }
    if (f.type === "textarea") {
      return '<div class="field full">' + label + '<textarea id="' + id + '" name="' + f.name + '"' + req + ' placeholder="' + esc(f.placeholder || "") + '">' + esc(value) + "</textarea>" + help + "</div>";
    }
    var list = f.list ? ' list="' + id + '-list"' : "";
    var dl = f.list ? '<datalist id="' + id + '-list">' + f.list.map(function (o) { return '<option value="' + esc(o) + '">'; }).join("") + "</datalist>" : "";
    var v = value === null || value === undefined ? "" : value;
    if (f.type === "month" && v) v = String(v).slice(0, 7);
    if (f.type === "date" && v) v = String(v).slice(0, 10);
    return '<div class="field' + full + '">' + label + '<input id="' + id + '" name="' + f.name + '" type="' + (f.type || "text") + '"' + (f.type === "number" ? ' step="' + (f.step || "1") + '" min="0"' : "") + req + list + ' value="' + esc(v) + '" placeholder="' + esc(f.placeholder || "") + '">' + dl + help + "</div>";
  }
  function readForm(form, fields) {
    var out = {};
    fields.forEach(function (f) {
      var el = form.elements[f.name];
      if (!el) return;
      if (f.type === "checkbox") { out[f.name] = el.checked; return; }
      var v = el.value.trim();
      if (f.type === "number") out[f.name] = v === "" ? (f.nullable ? null : 0) : Number(v);
      else if (f.type === "month") out[f.name] = v ? v + "-01" : null;
      else out[f.name] = v === "" ? null : v;
    });
    return out;
  }
  /* openForm({ title, fields, values, onSave(values) -> Promise<bool>, onDelete -> Promise<bool> }) */
  function openForm(o) {
    var vals = o.values || {};
    var html = '<form class="form-grid" id="modal-form" novalidate>' + o.fields.map(function (f) { return fieldHTML(f, vals[f.name]); }).join("") + "</form>" +
      '<div class="form-error" id="form-error" role="alert"></div>' +
      '<div class="form-actions">' + (o.onDelete ? '<button type="button" class="btn danger" id="form-delete">Delete</button>' : "") +
      '<div class="right"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" id="form-save">' + esc(o.saveLabel || "Save") + "</button></div></div>";
    openModal(o.title, html);
    var form = $("#modal-form");
    function save() {
      var data = readForm(form, o.fields);
      var missing = o.fields.filter(function (f) { return f.required && (data[f.name] === null || data[f.name] === ""); });
      if (missing.length) { $("#form-error").textContent = "Please fill in: " + missing.map(function (f) { return f.label; }).join(", ") + "."; return; }
      var btn = $("#form-save");
      btn.disabled = true; btn.textContent = "Saving...";
      Promise.resolve(o.onSave(data)).then(function (ok) {
        if (ok) { closeModal(); refresh(); }
        else { btn.disabled = false; btn.textContent = o.saveLabel || "Save"; }
      });
    }
    $("#form-save").addEventListener("click", save);
    form.addEventListener("submit", function (e) { e.preventDefault(); save(); });
    form.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); save(); } });
    var del = $("#form-delete");
    if (del) del.addEventListener("click", function () {
      if (!del.classList.contains("confirm")) { del.classList.add("confirm"); del.textContent = "Click again to delete"; return; }
      del.disabled = true;
      Promise.resolve(o.onDelete()).then(function (ok) { if (ok) { closeModal(); refresh(); } else del.disabled = false; });
    });
  }
  $("#modal").addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });

  /* ---------------------------------------------------------------
     CSV download that opens properly in Excel
     --------------------------------------------------------------- */
  function downloadCSV(filename, headers, rows) {
    function cell(v) { return '"' + String(v === null || v === undefined ? "" : v).replace(/"/g, '""') + '"'; }
    var text = "﻿" + [headers].concat(rows).map(function (r) { return r.map(cell).join(","); }).join("\r\n");
    var blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    var t = document.createElement("textarea");
    t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    t.remove(); return ok;
  }

  /* ---------------------------------------------------------------
     Charts (simple SVG, no library)
     --------------------------------------------------------------- */
  function emptyChart(sentence) { return '<div class="chart-empty">' + esc(sentence) + "</div>"; }
  function barChart(labels, values, opts) {
    opts = opts || {};
    var total = values.reduce(function (a, b) { return a + n(b); }, 0);
    if (!values.length || total === 0) return emptyChart(opts.empty || "Nothing to show yet.");
    var W = 600, H = 190, pl = 30, pr = 6, pt = 12, pb = 24;
    var max = Math.max.apply(null, values.map(n));
    var cw = (W - pl - pr) / values.length;
    var bw = Math.max(4, cw * 0.62);
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(opts.label || "Bar chart") + '">';
    [0, 0.5, 1].forEach(function (f) {
      var y = pt + (H - pt - pb) * (1 - f);
      s += '<line class="axis" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '"/>';
      s += '<text x="' + (pl - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + fmtNum(Math.round(max * f)) + "</text>";
    });
    var every = values.length > 14 ? 2 : 1;
    values.forEach(function (v, i) {
      var h = (H - pt - pb) * (n(v) / max);
      var x = pl + cw * i + (cw - bw) / 2;
      var y = H - pb - h;
      s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(h, n(v) > 0 ? 2 : 0) + '" rx="3" fill="' + (opts.color || "#DF982E") + '"><title>' + esc(labels[i]) + ": " + fmtNum(v) + "</title></rect>";
      if (i % every === 0) s += '<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(labels[i]) + "</text>";
    });
    return '<div class="chart">' + s + "</svg></div>";
  }
  function lineChart(labels, values, opts) {
    opts = opts || {};
    if (values.length < 2) return emptyChart(opts.empty || "This chart appears once there are at least two months logged.");
    var W = 600, H = 170, pl = 46, pr = 12, pt = 14, pb = 24;
    var nums = values.map(n);
    var min = Math.min.apply(null, nums), max = Math.max.apply(null, nums);
    if (min === max) { min = Math.max(0, min - 1); max = max + 1; }
    function X(i) { return pl + (W - pl - pr) * (values.length === 1 ? 0.5 : i / (values.length - 1)); }
    function Y(v) { return pt + (H - pt - pb) * (1 - (v - min) / (max - min)); }
    var color = opts.color || "#294268";
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(opts.label || "Line chart") + '">';
    [min, (min + max) / 2, max].forEach(function (v) {
      s += '<line class="axis" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>';
      s += '<text x="' + (pl - 6) + '" y="' + (Y(v) + 3) + '" text-anchor="end">' + fmtNum(Math.round(v)) + "</text>";
    });
    s += '<polyline fill="none" stroke="' + color + '" stroke-width="2.2" points="' + nums.map(function (v, i) { return X(i) + "," + Y(v); }).join(" ") + '"/>';
    var every = Math.ceil(values.length / 8);
    nums.forEach(function (v, i) {
      s += '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="3.2" fill="#fff" stroke="' + color + '" stroke-width="2"><title>' + esc(labels[i]) + ": " + fmtNum(v) + "</title></circle>";
      if (i % every === 0 || i === values.length - 1) s += '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(labels[i]) + "</text>";
    });
    return '<div class="chart">' + s + "</svg></div>";
  }
  function progressBar(pct) {
    var p = isFinite(pct) ? Math.max(0, Math.min(100, Math.round(pct))) : 0;
    return '<div class="progress' + (p === 100 ? " done" : "") + '" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + p + '%"></span></div>';
  }
  function exPill(row) { return row && row.is_example ? '<span class="pill example">Example</span>' : ""; }

  /* ---------------------------------------------------------------
     Colours for the pills
     --------------------------------------------------------------- */
  var STATUS = ["Lead", "Talking", "Proposal sent", "Client", "Not now"];
  var STATUS_COLOUR = { "Lead": "navy", "Talking": "gold", "Proposal sent": "purple", "Client": "green", "Not now": "" };
  var SOURCES = ["Contact form", "Pricing guide", "Referral", "Instagram", "Other"];
  var STAGES = ["Proposal", "Onboarding", "Active", "Paused", "Finished"];
  var STAGE_COLOUR = { "Proposal": "purple", "Onboarding": "navy", "Active": "green", "Paused": "gold", "Finished": "" };
  var TYPES = ["Monthly package", "One-off job"];
  var TYPE_COLOUR = { "Monthly package": "navy", "One-off job": "gold" };
  var FORMATS = ["Reel", "Carousel", "Photo", "Story"];
  var CAL_TYPES = ["Shoot", "Create", "Approval", "Post", "Report", "Call"];
  var CAL_COLOUR = { "Shoot": "#DF982E", "Create": "#294268", "Approval": "#5B3F86", "Post": "#2E6B3F", "Report": "#1F7A74", "Call": "#B05A7A" };
  function pill(text, colour) { return text ? '<span class="pill ' + (colour || "") + '">' + esc(text) + "</span>" : ""; }

  /* ---------------------------------------------------------------
     Navigation between tabs
     --------------------------------------------------------------- */
  var TABS = {
    portfolio: { title: "Portfolio", render: renderPortfolio },
    leads: { title: "Leads", render: renderLeads },
    clients: { title: "Clients and jobs", render: renderClients },
    calendar: { title: "Calendar", render: renderCalendar },
    results: { title: "Results", render: renderResults },
    checklists: { title: "Checklists", render: renderChecklists },
    numbers: { title: "My numbers", render: renderNumbers },
    inspiration: { title: "Inspiration", render: renderInspiration }
  };
  var current = "portfolio";
  var renderId = 0;
  function go(tab) {
    if (!TABS[tab]) tab = "portfolio";
    if (tab === "inspiration" && typeof insState !== "undefined") { insState.view = "grid"; insState.id = null; }
    current = tab;
    $$("#nav button").forEach(function (b) {
      if (b.dataset.tab === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    $("#tab-title").textContent = TABS[tab].title;
    document.title = TABS[tab].title + " | The Gemini Social admin";
    if (location.hash !== "#" + tab) history.replaceState(null, "", "#" + tab);
    closeDrawer();
    refresh();
  }
  function refresh() {
    var id = ++renderId;
    var view = $("#view");
    clearNotices();
    if (!view.innerHTML) view.innerHTML = '<p class="empty">Loading...</p>';
    var tmp = document.createElement("div");
    Promise.resolve().then(function () { return TABS[current].render(tmp, id); }).then(function () {
      if (id === renderId) { view.innerHTML = ""; view.appendChild(tmp); }
    }, function (e) {
      if (id !== renderId) return;
      console.error(e);
      view.innerHTML = '<div class="notice error"><strong>This tab hit a problem.</strong>&nbsp;The rest of the admin still works. Try another tab, or refresh the page. (' + esc(e && e.message) + ")</div>";
    });
  }
  function openDrawer() { $("#sidebar").classList.add("open"); $("#scrim").hidden = false; $("#menu-btn").setAttribute("aria-expanded", "true"); }
  function closeDrawer() { $("#sidebar").classList.remove("open"); $("#scrim").hidden = true; $("#menu-btn").setAttribute("aria-expanded", "false"); }

  /* =================================================================
     1. PORTFOLIO
     ================================================================= */
  function renderPortfolio(root) {
    var since = iso(addDays(todayDate(), -13));
    return Promise.all([
      read("portfolio_items", function (q) { return q.order("position", { ascending: true }).order("created_at", { ascending: true }); }),
      readAll("visits", function (q) { return q.gte("visited_on", since); })
    ]).then(function (r) {
      var items = r[0].rows, visits = r[1].rows;
      var days = [], counts = [];
      for (var i = 13; i >= 0; i--) { var d = addDays(todayDate(), -i); days.push(iso(d)); counts.push(0); }
      var labels = days.map(function (d) { return d.slice(8, 10) + "/" + d.slice(5, 7); });
      var sources = {};
      visits.forEach(function (v) {
        var idx = days.indexOf(String(v.visited_on).slice(0, 10));
        if (idx > -1) counts[idx]++;
        var s = v.source || "Direct";
        if (s !== "Internal") sources[s] = (sources[s] || 0) + 1;
      });
      var total14 = counts.reduce(function (a, b) { return a + b; }, 0);
      var todayCount = counts[counts.length - 1];
      var live = items.filter(function (x) { return x.visible && !x.is_example; });
      var niches = {};
      live.forEach(function (x) { if (x.niche) niches[x.niche] = (niches[x.niche] || 0) + 1; });
      var topNiche = Object.keys(niches).sort(function (a, b) { return niches[b] - niches[a]; })[0];
      var srcKeys = Object.keys(sources).sort(function (a, b) { return sources[b] - sources[a]; });
      var srcMax = srcKeys.length ? sources[srcKeys[0]] : 0;

      var html = '<div class="strip">' +
        stat("Visits, last 14 days", fmtNum(total14)) +
        stat("Visits today", fmtNum(todayCount)) +
        stat("Items live on the site", fmtNum(live.length)) +
        stat("Strongest niche", topNiche ? esc(topNiche) : "None yet", topNiche ? plural(niches[topNiche], "live item") : "") +
        stat("Top source", srcKeys[0] ? esc(srcKeys[0]) : "None yet", srcKeys[0] ? plural(sources[srcKeys[0]], "visit") : "") +
        "</div>";
      html += '<div class="grid-2"><div class="card"><h2>Visits, last 14 days</h2>' +
        barChart(labels, counts, { label: "Visits per day", empty: "Once people start visiting your site, you'll see a bar for each of the last 14 days here." }) +
        '</div><div class="card"><h2>Where visitors came from</h2>' +
        (srcKeys.length ? '<div class="bars-list">' + srcKeys.slice(0, 8).map(function (k) {
          return '<div class="row"><span>' + esc(k) + '</span><div class="track"><div class="fill" style="width:' + Math.round(sources[k] / srcMax * 100) + '%"></div></div><span class="n">' + fmtNum(sources[k]) + "</span></div>";
        }).join("") + "</div>" : emptyChart("When visitors arrive from Instagram, Google, links you share and so on, the list of sources will show here.")) +
        "</div></div>";

      html += '<div class="card"><div class="card-head"><h2>Portfolio items <span class="muted">(drag to reorder)</span></h2><button type="button" class="btn primary" id="add-item">' + ICON.plus + "Add item</button></div>";
      if (!items.length) {
        html += '<p class="empty">No portfolio items yet. Click "Add item" to add your first one. Until you have visible items, your site shows a few of your existing posts.</p>';
      } else {
        html += '<div class="table-wrap"><table><thead><tr><th></th><th>Cover</th><th>Title</th><th>Client</th><th>Niche</th><th>Format</th><th>Highlight</th><th>On site</th></tr></thead><tbody id="items-body">' +
          items.map(function (x) {
            var src = x.cover_url ? (/^(https?:)?\/\//.test(x.cover_url) || x.cover_url.charAt(0) === "/" ? x.cover_url : "../" + x.cover_url) : "";
            return '<tr class="clickable' + (x.visible ? "" : " hidden-item") + '" data-id="' + esc(x.id) + '" data-pos="' + n(x.position) + '">' +
              '<td class="keep"><button type="button" class="icon-btn handle" aria-label="Drag to reorder, or use the arrow keys">' + ICON.grip + "</button></td>" +
              "<td>" + (src ? '<img class="thumb" src="' + esc(src) + '" alt="" loading="lazy">' : '<span class="thumb empty-thumb">' + ICON.image + "</span>") + "</td>" +
              "<td>" + esc(x.title) + exPill(x) + "</td><td>" + esc(x.client) + "</td><td>" + esc(x.niche) + "</td><td>" + pill(x.format, "navy") + "</td><td>" + esc(x.highlight) + "</td>" +
              '<td class="keep nowrap"><button type="button" class="icon-btn eye' + (x.visible ? " on" : "") + '" data-act="visible" aria-pressed="' + !!x.visible + '" aria-label="' + (x.visible ? "Showing on the site, click to hide" : "Hidden from the site, click to show") + '">' + (x.visible ? ICON.eye : ICON.eyeOff) + "</button>" +
              '<button type="button" class="icon-btn' + (x.featured ? " on" : "") + '" data-act="featured" aria-pressed="' + !!x.featured + '" aria-label="' + (x.featured ? "Featured, click to unfeature" : "Not featured, click to feature") + '">' + ICON.star + "</button></td></tr>";
          }).join("") + "</tbody></table></div>";
      }
      html += "</div>";
      root.innerHTML = html;

      var byId = {}; items.forEach(function (x) { byId[x.id] = x; });
      var nicheList = ["Fitness and Wellness", "Property", "Personal Brands"].concat(Object.keys(niches)).filter(function (v, i, a) { return a.indexOf(v) === i; });
      function itemForm(x) {
        openForm({
          title: x ? "Edit portfolio item" : "Add portfolio item",
          values: x || { visible: true, featured: false, format: "Reel" },
          fields: [
            { name: "title", label: "Title", required: true, full: true },
            { name: "client", label: "Client" },
            { name: "niche", label: "Niche", list: nicheList },
            { name: "format", label: "Format", type: "select", options: FORMATS },
            { name: "highlight", label: "Highlight", placeholder: "e.g. 120K views" },
            { name: "link", label: "Link to the post", type: "url", full: true, placeholder: "https://www.instagram.com/p/..." },
            { name: "cover_url", label: "Cover image link", full: true, placeholder: "https://... or media/my-image.jpg", help: "Paste a link to the image, or the name of a file in your site's media folder, like media/jpb-post-1.jpg" },
            { name: "featured", label: "Featured (shows bigger, at the front)", type: "checkbox", full: true },
            { name: "visible", label: "Show on my site", type: "checkbox", full: true }
          ],
          onSave: function (v) {
            if (x) return write(db.from("portfolio_items").update(v).eq("id", x.id), "portfolio_items", "Saved");
            var maxPos = items.reduce(function (m, i) { return Math.max(m, n(i.position)); }, -1);
            v.position = maxPos + 1;
            return write(db.from("portfolio_items").insert(v), "portfolio_items", "Item added");
          },
          onDelete: x ? function () { return write(db.from("portfolio_items").delete().eq("id", x.id), "portfolio_items", "Deleted"); } : null
        });
      }
      $("#add-item", root).addEventListener("click", function () { itemForm(null); });
      var body = $("#items-body", root);
      if (!body) return;
      body.addEventListener("click", function (e) {
        var tr = e.target.closest("tr"); if (!tr) return;
        var x = byId[tr.dataset.id];
        var act = e.target.closest("[data-act]");
        if (act) {
          var field = act.dataset.act, patch = {};
          patch[field] = !x[field];
          write(db.from("portfolio_items").update(patch).eq("id", x.id), "portfolio_items", field === "visible" ? (patch.visible ? "Now showing on your site" : "Hidden from your site") : (patch.featured ? "Marked as featured" : "No longer featured")).then(function (ok) { if (ok) refresh(); });
          return;
        }
        if (e.target.closest(".handle")) return;
        itemForm(x);
      });
      // Drag to reorder (mouse and touch), or arrow keys on the handle
      function saveOrder() {
        var rows = $$("tr", body), jobs = [];
        rows.forEach(function (tr, i) {
          var x = byId[tr.dataset.id];
          if (n(x.position) !== i) { x.position = i; jobs.push(db.from("portfolio_items").update({ position: i }).eq("id", x.id)); }
        });
        if (!jobs.length) return;
        Promise.all(jobs).then(function (res) {
          var bad = res.filter(function (r) { return r.error; });
          if (bad.length) { explain(bad[0].error, "portfolio_items"); toast("Couldn't save the new order", true); }
          else toast("New order saved");
        });
      }
      body.addEventListener("pointerdown", function (e) {
        var h = e.target.closest(".handle"); if (!h) return;
        e.preventDefault();
        var row = h.closest("tr");
        row.classList.add("dragging");
        try { h.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        function move(ev) {
          var others = $$("tr", body).filter(function (r) { return r !== row; });
          var before = null;
          for (var k = 0; k < others.length; k++) {
            var b = others[k].getBoundingClientRect();
            if (ev.clientY < b.top + b.height / 2) { before = others[k]; break; }
          }
          if (before !== row.nextSibling) body.insertBefore(row, before);
        }
        function up() {
          h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up);
          row.classList.remove("dragging");
          saveOrder();
        }
        h.addEventListener("pointermove", move); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
      });
      body.addEventListener("keydown", function (e) {
        var h = e.target.closest(".handle"); if (!h) return;
        var row = h.closest("tr");
        if (e.key === "ArrowUp" && row.previousElementSibling) { e.preventDefault(); body.insertBefore(row, row.previousElementSibling); h.focus(); saveOrder(); }
        if (e.key === "ArrowDown" && row.nextElementSibling) { e.preventDefault(); body.insertBefore(row.nextElementSibling, row); h.focus(); saveOrder(); }
      });
    });
  }
  function stat(label, value, small) {
    return '<div class="stat"><div class="label">' + esc(label) + '</div><div class="value">' + value + "</div>" + (small ? '<div class="small">' + small + "</div>" : "") + "</div>";
  }

  /* =================================================================
     2. LEADS
     ================================================================= */
  var leadsState = { q: "", status: "", source: "" };
  function igLink(handle) {
    if (!handle) return "";
    var h = String(handle).trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "");
    return h ? "https://www.instagram.com/" + encodeURIComponent(h) + "/" : "";
  }
  function waLink(phone) {
    if (!phone) return "";
    var p = String(phone).trim();
    var digits = p.replace(/[^\d]/g, "");
    if (!digits) return "";
    if (p.charAt(0) !== "+" && digits.charAt(0) === "0") digits = "61" + digits.slice(1); // Australian number written with a 0
    return "https://wa.me/" + digits;
  }
  function needsFollowUp(c) {
    if (["Lead", "Talking", "Proposal sent"].indexOf(c.status) === -1) return false;
    var last = parseDate(c.last_contact) || parseDate(c.created_at);
    return last ? daysBetween(last, todayDate()) > 7 : false;
  }
  function renderLeads(root) {
    return read("contacts", function (q) { return q.order("created_at", { ascending: false }); }).then(function (r) {
      var all = r.rows;
      var real = all.filter(function (c) { return !c.is_example; });
      var mStart = parseDate(thisMonth());
      var d90 = addDays(todayDate(), -90);
      var newThisMonth = real.filter(function (c) { var d = parseDate(c.created_at); return d && d >= mStart; }).length;
      var last90 = real.filter(function (c) { var d = parseDate(c.created_at); return d && d >= d90; });
      var clients = real.filter(function (c) { return c.status === "Client"; }).length;
      var pct = real.length ? Math.round(clients / real.length * 100) : 0;
      var bySource = {};
      var won = real.filter(function (c) { return c.status === "Client"; });
      (won.length ? won : last90).forEach(function (c) { bySource[c.source || "Other"] = (bySource[c.source || "Other"] || 0) + 1; });
      var best = Object.keys(bySource).sort(function (a, b) { return bySource[b] - bySource[a]; })[0];

      var html = '<div class="strip">' +
        stat("New leads this month", fmtNum(newThisMonth)) +
        stat("Leads, last 90 days", fmtNum(last90.length)) +
        stat("Became clients", fmtNum(clients), real.length ? pct + "% of all leads" : "No leads yet") +
        stat("Best source", best ? esc(best) : "None yet", best ? (won.length ? plural(bySource[best], "client") + " from here" : plural(bySource[best], "lead") + " in 90 days") : "") +
        "</div>";
      html += '<div class="toolbar"><div class="grow"><input type="search" id="lead-q" placeholder="Search name, business, @ or email" value="' + esc(leadsState.q) + '" aria-label="Search leads"></div>' +
        '<select id="lead-status" aria-label="Filter by status"><option value="">All statuses</option>' + STATUS.map(function (s) { return "<option" + (leadsState.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>" +
        '<select id="lead-source" aria-label="Filter by source"><option value="">All sources</option>' + SOURCES.map(function (s) { return "<option" + (leadsState.source === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>" +
        '<button type="button" class="btn primary" id="lead-add">' + ICON.plus + "Add lead</button>" +
        '<button type="button" class="btn" id="lead-csv">' + ICON.download + "Download CSV</button></div>";
      html += '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Business</th><th>Instagram</th><th>Email</th><th>Phone</th><th>Status</th><th>Source</th><th>Notes</th><th>Last contact</th></tr></thead><tbody id="lead-body"></tbody></table></div>';
      root.innerHTML = html;

      var byId = {}; all.forEach(function (c) { byId[c.id] = c; });
      function filtered() {
        var q = leadsState.q.toLowerCase().replace(/^@/, "");
        return all.filter(function (c) {
          if (leadsState.status && c.status !== leadsState.status) return false;
          if (leadsState.source && c.source !== leadsState.source) return false;
          if (!q) return true;
          return [c.name, c.business, c.instagram, c.email].some(function (v) { return v && String(v).toLowerCase().replace(/^@/, "").indexOf(q) > -1; });
        });
      }
      function draw() {
        var rows = filtered();
        $("#lead-body", root).innerHTML = rows.length ? rows.map(function (c) {
          var ig = igLink(c.instagram), wa = waLink(c.phone);
          return '<tr class="clickable" data-id="' + esc(c.id) + '">' +
            '<td class="nowrap">' + esc(c.name || "(no name)") + exPill(c) + (needsFollowUp(c) ? '<span class="tag yellow">follow up</span>' : "") + "</td>" +
            "<td>" + esc(c.business) + "</td>" +
            "<td>" + (ig ? '<a href="' + esc(ig) + '" target="_blank" rel="noopener">' + esc(c.instagram) + "</a>" : esc(c.instagram)) + "</td>" +
            "<td>" + (c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" : "") + "</td>" +
            '<td class="nowrap">' + esc(c.phone) + (wa ? '<a class="wa" href="' + esc(wa) + '" target="_blank" rel="noopener">' + ICON.whatsapp + "WhatsApp</a>" : "") + "</td>" +
            "<td>" + pill(c.status, STATUS_COLOUR[c.status]) + "</td>" +
            '<td class="nowrap">' + esc(c.source) + "</td>" +
            '<td class="clip" title="' + esc(c.notes) + '">' + esc(c.notes) + "</td>" +
            '<td class="nowrap">' + esc(fmtDate(c.last_contact)) + "</td></tr>";
        }).join("") : '<tr><td colspan="9" class="empty">' + (all.length ? "No leads match your search or filters." : "No leads yet. New ones from your contact form and pricing guide will appear here by themselves.") + "</td></tr>";
      }
      draw();
      $("#lead-q", root).addEventListener("input", function (e) { leadsState.q = e.target.value; draw(); });
      $("#lead-status", root).addEventListener("change", function (e) { leadsState.status = e.target.value; draw(); });
      $("#lead-source", root).addEventListener("change", function (e) { leadsState.source = e.target.value; draw(); });
      function leadForm(c) {
        openForm({
          title: c ? "Edit lead" : "Add lead",
          values: c || { status: "Lead", source: "Instagram", last_contact: today() },
          fields: [
            { name: "name", label: "Name", required: true },
            { name: "business", label: "Business" },
            { name: "instagram", label: "Instagram", placeholder: "@theirbusiness" },
            { name: "email", label: "Email", type: "email" },
            { name: "phone", label: "Phone", type: "tel", help: "Include the country code, e.g. +1 for the US, so WhatsApp works" },
            { name: "last_contact", label: "Last contact", type: "date" },
            { name: "status", label: "Status", type: "select", options: STATUS },
            { name: "source", label: "Source", type: "select", options: SOURCES },
            { name: "notes", label: "Notes", type: "textarea" }
          ],
          onSave: function (v) {
            return c ? write(db.from("contacts").update(v).eq("id", c.id), "contacts", "Saved") : write(db.from("contacts").insert(v), "contacts", "Lead added");
          },
          onDelete: c ? function () { return write(db.from("contacts").delete().eq("id", c.id), "contacts", "Deleted"); } : null
        });
      }
      $("#lead-add", root).addEventListener("click", function () { leadForm(null); });
      $("#lead-body", root).addEventListener("click", function (e) {
        if (e.target.closest("a")) return;
        var tr = e.target.closest("tr[data-id]"); if (tr) leadForm(byId[tr.dataset.id]);
      });
      $("#lead-csv", root).addEventListener("click", function () {
        var rows = filtered();
        if (!rows.length) { toast("There's nothing to download yet"); return; }
        downloadCSV("leads-" + today() + ".csv",
          ["Name", "Business", "Instagram", "Email", "Phone", "Status", "Source", "Notes", "Last contact", "Added on"],
          rows.map(function (c) { return [c.name, c.business, c.instagram, c.email, c.phone, c.status, c.source, c.notes, fmtDate(c.last_contact), fmtDate(c.created_at)]; }));
      });
    });
  }

  /* =================================================================
     3. CLIENTS AND JOBS
     ================================================================= */
  var clientsState = { filter: "all", q: "", sort: { key: "name", dir: 1 } };
  function dueTag(c) {
    if (c.type !== "One-off job" || c.stage === "Finished" || !c.due_date) return "";
    var days = daysBetween(todayDate(), parseDate(c.due_date));
    if (days < 0) return '<span class="tag red">' + plural(-days, "day") + " overdue</span>";
    if (days === 0) return '<span class="tag yellow">Due today</span>';
    if (days <= 3) return '<span class="tag yellow">Due in ' + plural(days, "day") + "</span>";
    return "";
  }
  function isFinished(c) { return c.active === false || c.stage === "Finished"; }
  function renderClients(root) {
    return read("clients").then(function (r) {
      var all = r.rows;
      var active = all.filter(function (c) { return c.active !== false && c.stage !== "Finished"; });
      var monthly = active.filter(function (c) { return c.type === "Monthly package"; });
      var oneOff = active.filter(function (c) { return c.type === "One-off job"; });
      var withValue = monthly.filter(function (c) { return c.monthly_value !== null && c.monthly_value !== undefined && n(c.monthly_value) > 0; });
      var total = withValue.reduce(function (a, c) { return a + n(c.monthly_value); }, 0);
      var html = '<div class="strip">' +
        stat("Active clients", fmtNum(active.length)) +
        stat("Monthly packages", fmtNum(monthly.length)) +
        stat("One-off jobs in progress", fmtNum(oneOff.length)) +
        (withValue.length ? stat("Total monthly value", money(total), withValue.length < monthly.length ? "from " + withValue.length + " of " + monthly.length + " packages" : "") : "") +
        "</div>";
      html += '<div class="toolbar"><div class="seg" role="group" aria-label="Show">' +
        ["all", "active", "finished"].map(function (f) { return '<button type="button" data-filter="' + f + '" aria-pressed="' + (clientsState.filter === f) + '">' + f.charAt(0).toUpperCase() + f.slice(1) + "</button>"; }).join("") +
        '</div><div class="grow"><input type="search" id="client-q" placeholder="Search clients" value="' + esc(clientsState.q) + '" aria-label="Search clients"></div>' +
        '<button type="button" class="btn primary" id="client-add">' + ICON.plus + "Add client or job</button>" +
        '<button type="button" class="btn" id="client-csv">' + ICON.download + "Download</button></div>";
      html += '<div class="table-wrap"><table><thead><tr id="client-head"></tr></thead><tbody id="client-body"></tbody></table></div>';
      root.innerHTML = html;

      var COLS = [
        { key: "favourite", label: "Star" }, { key: "name", label: "Client" }, { key: "type", label: "Type" },
        { key: "included", label: "What's included" }, { key: "stage", label: "Stage" },
        { key: "start_date", label: "Start date" }, { key: "due_date", label: "Due date" }
      ];
      var byId = {}; all.forEach(function (c) { byId[c.id] = c; });
      function rows() {
        var q = clientsState.q.toLowerCase();
        var list = all.filter(function (c) {
          if (clientsState.filter === "active" && isFinished(c)) return false;
          if (clientsState.filter === "finished" && !isFinished(c)) return false;
          return !q || [c.name, c.included, c.type, c.stage].some(function (v) { return v && String(v).toLowerCase().indexOf(q) > -1; });
        });
        var k = clientsState.sort.key, dir = clientsState.sort.dir;
        list.sort(function (a, b) {
          var A = a[k], B = b[k];
          if (k === "stage") { A = STAGES.indexOf(a.stage); B = STAGES.indexOf(b.stage); return (A - B) * dir; }
          if (k === "favourite") { return ((B ? 1 : 0) - (A ? 1 : 0)) * dir; }
          var emptyA = A === null || A === undefined || A === "", emptyB = B === null || B === undefined || B === "";
          if (emptyA && emptyB) return 0;
          if (emptyA) return 1;
          if (emptyB) return -1;
          return String(A).localeCompare(String(B), "en-AU", { sensitivity: "base" }) * dir;
        });
        return list;
      }
      function draw() {
        $("#client-head", root).innerHTML = COLS.map(function (c) {
          var on = clientsState.sort.key === c.key;
          var sign = on ? (clientsState.sort.dir === 1 ? "&#9650;" : "&#9660;") : "&#8597;";
          return '<th class="sortable' + (on ? " sorted" : "") + '" data-key="' + c.key + '" aria-sort="' + (on ? (clientsState.sort.dir === 1 ? "ascending" : "descending") : "none") + '" tabindex="0">' + c.label + '<span class="sort-sign" aria-hidden="true">' + sign + "</span></th>";
        }).join("");
        var list = rows();
        $("#client-body", root).innerHTML = list.length ? list.map(function (c) {
          return '<tr class="clickable' + (c.favourite ? " fav" : "") + '" data-id="' + esc(c.id) + '">' +
            '<td><button type="button" class="icon-btn' + (c.favourite ? " on" : "") + '" data-act="fav" aria-pressed="' + !!c.favourite + '" aria-label="' + (c.favourite ? "Remove star" : "Add star") + '">' + ICON.star + "</button></td>" +
            '<td class="nowrap">' + esc(c.name) + exPill(c) + "</td>" +
            "<td>" + pill(c.type, TYPE_COLOUR[c.type]) + "</td>" +
            '<td class="clip" title="' + esc(c.included) + '">' + esc(c.included) + "</td>" +
            "<td>" + pill(c.stage, STAGE_COLOUR[c.stage]) + "</td>" +
            '<td class="nowrap">' + esc(fmtDate(c.start_date)) + "</td>" +
            '<td class="nowrap">' + esc(fmtDate(c.due_date)) + dueTag(c) + "</td></tr>";
        }).join("") : '<tr><td colspan="7" class="empty">' + (all.length ? "No clients match this view." : "No clients yet. Click \"Add client or job\" to add your first one.") + "</td></tr>";
      }
      draw();
      function sortBy(key) {
        if (clientsState.sort.key === key) clientsState.sort.dir *= -1; else clientsState.sort = { key: key, dir: 1 };
        draw();
      }
      $("#client-head", root).addEventListener("click", function (e) { var th = e.target.closest("th[data-key]"); if (th) sortBy(th.dataset.key); });
      $("#client-head", root).addEventListener("keydown", function (e) { var th = e.target.closest("th[data-key]"); if (th && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); sortBy(th.dataset.key); } });
      $$(".seg button", root).forEach(function (b) {
        b.addEventListener("click", function () {
          clientsState.filter = b.dataset.filter;
          $$(".seg button", root).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
          draw();
        });
      });
      $("#client-q", root).addEventListener("input", function (e) { clientsState.q = e.target.value; draw(); });
      function clientForm(c) {
        openForm({
          title: c ? "Edit client or job" : "Add client or job",
          values: c || { type: "Monthly package", stage: "Proposal", active: true, start_date: today() },
          fields: [
            { name: "name", label: "Client name", required: true },
            { name: "type", label: "Type", type: "select", options: TYPES },
            { name: "stage", label: "Stage", type: "select", options: STAGES },
            { name: "monthly_value", label: "Monthly value in AUD (optional)", type: "number", step: "0.01", nullable: true },
            { name: "start_date", label: "Start date", type: "date" },
            { name: "due_date", label: "Due date (one-off jobs)", type: "date" },
            { name: "included", label: "What's included", type: "textarea", placeholder: "e.g. 3 posts per week, 6 reels per month, monthly report" },
            { name: "active", label: "Active", type: "checkbox" },
            { name: "favourite", label: "Star this client", type: "checkbox" }
          ],
          onSave: function (v) {
            if (v.stage === "Finished") v.active = false;
            return c ? write(db.from("clients").update(v).eq("id", c.id), "clients", "Saved") : write(db.from("clients").insert(v), "clients", "Client added");
          },
          onDelete: c ? function () { return write(db.from("clients").delete().eq("id", c.id), "clients", "Deleted"); } : null
        });
      }
      $("#client-add", root).addEventListener("click", function () { clientForm(null); });
      $("#client-body", root).addEventListener("click", function (e) {
        var tr = e.target.closest("tr[data-id]"); if (!tr) return;
        var c = byId[tr.dataset.id];
        if (e.target.closest('[data-act="fav"]')) {
          write(db.from("clients").update({ favourite: !c.favourite }).eq("id", c.id), "clients").then(function (ok) { if (ok) { c.favourite = !c.favourite; draw(); } });
          return;
        }
        clientForm(c);
      });
      $("#client-csv", root).addEventListener("click", function () {
        var list = rows();
        if (!list.length) { toast("There's nothing to download yet"); return; }
        downloadCSV("clients-" + today() + ".csv",
          ["Client", "Type", "What's included", "Stage", "Monthly value (AUD)", "Start date", "Due date", "Active", "Starred"],
          list.map(function (c) { return [c.name, c.type, c.included, c.stage, c.monthly_value === null || c.monthly_value === undefined ? "" : n(c.monthly_value).toFixed(2), fmtDate(c.start_date), fmtDate(c.due_date), c.active === false ? "No" : "Yes", c.favourite ? "Yes" : "No"]; }));
      });
    });
  }

  /* =================================================================
     4. CALENDAR
     ================================================================= */
  var calState = { month: thisMonth(), type: "", client: "" };
  function renderCalendar(root) {
    var first = parseDate(calState.month);
    var offset = (first.getDay() + 6) % 7; // Monday first
    var gridStart = addDays(first, -offset);
    var daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    var weeks = Math.ceil((offset + daysInMonth) / 7);
    var gridEnd = addDays(gridStart, weeks * 7 - 1);
    return Promise.all([
      read("calendar", function (q) { return q.gte("date", iso(gridStart)).lte("date", iso(gridEnd)).order("date"); }),
      read("clients"),
      read("calendar", function (q) { return q.lt("date", today()).eq("status", "To do").order("date"); })
    ]).then(function (r) {
      var items = r[0].rows, clients = r[1].rows, slipped = r[2].rows;
      var clientName = {}; clients.forEach(function (c) { clientName[c.id] = c.name; });
      var dueJobs = clients.filter(function (c) { return c.type === "One-off job" && c.stage !== "Finished" && c.active !== false && c.due_date; });

      function itemsOn(day) {
        var list = items.filter(function (x) {
          if (String(x.date).slice(0, 10) !== day) return false;
          if (calState.type && x.type !== calState.type) return false;
          if (calState.client && x.client_id !== calState.client) return false;
          return true;
        }).map(function (x) { return { kind: "item", row: x }; });
        if (!calState.type) dueJobs.forEach(function (c) {
          if (String(c.due_date).slice(0, 10) === day && (!calState.client || calState.client === c.id)) list.push({ kind: "due", row: c });
        });
        return list;
      }
      function chip(e) {
        if (e.kind === "due") return '<button type="button" class="chip due" data-due="' + esc(e.row.id) + '" title="Due date: ' + esc(e.row.name) + '"><span>Due: ' + esc(e.row.name) + "</span></button>";
        var x = e.row;
        return '<button type="button" class="chip' + (x.status === "Done" ? " done" : "") + '" data-item="' + esc(x.id) + '" title="' + esc(x.type + ": " + x.title + (clientName[x.client_id] ? " (" + clientName[x.client_id] + ")" : "")) + '"><i style="background:' + (CAL_COLOUR[x.type] || "#999") + '"></i><span>' + esc(x.title) + "</span></button>";
      }

      var html = '<div class="toolbar"><div class="cal-nav"><button type="button" class="icon-btn" id="cal-prev" aria-label="Previous month">' + ICON.left + "</button><strong>" + esc(monthLabel(calState.month)) + '</strong><button type="button" class="icon-btn" id="cal-next" aria-label="Next month">' + ICON.right + '</button><button type="button" class="btn" id="cal-today">This month</button></div>' +
        '<div class="grow"></div><select id="cal-type" aria-label="Filter by type"><option value="">All types</option>' + CAL_TYPES.map(function (t) { return "<option" + (calState.type === t ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select>" +
        '<select id="cal-client" aria-label="Filter by client"><option value="">All clients</option>' + clients.map(function (c) { return '<option value="' + esc(c.id) + '"' + (calState.client === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") + "</select>" +
        '<button type="button" class="btn primary" id="cal-add">' + ICON.plus + "Add</button></div>";
      html += '<div class="legend">' + CAL_TYPES.map(function (t) { return '<span><i style="background:' + CAL_COLOUR[t] + '"></i>' + t + "</span>"; }).join("") + '<span><i style="background:#B3261E"></i>Job due date</span></div>';
      html += '<div class="cal"><div class="cal-head">' + ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(function (d) { return "<div>" + d + "</div>"; }).join("") + '</div><div class="cal-grid">';
      var t = today();
      for (var i = 0; i < weeks * 7; i++) {
        var d = addDays(gridStart, i), key = iso(d);
        var list = itemsOn(key);
        var other = d.getMonth() !== first.getMonth();
        html += '<div class="day' + (other ? " other" : "") + (key === t ? " today" : "") + '" data-date="' + key + '" role="button" tabindex="0" aria-label="' + esc(fmtDate(key) + ", " + plural(list.length, "item")) + '">' +
          '<span class="num">' + d.getDate() + "</span>" +
          '<button type="button" class="add" data-add="' + key + '" aria-label="Add on ' + esc(fmtDate(key)) + '">+</button>' +
          list.slice(0, 3).map(chip).join("") +
          (list.length > 3 ? '<button type="button" class="more" data-more="' + key + '">+' + (list.length - 3) + " more</button>" : "") + "</div>";
      }
      html += "</div></div>";

      // Slipped through
      var overdueJobs = dueJobs.filter(function (c) { return parseDate(c.due_date) < todayDate(); });
      var slip = slipped.map(function (x) { return { kind: "item", row: x, date: x.date }; }).concat(overdueJobs.map(function (c) { return { kind: "due", row: c, date: c.due_date }; }));
      slip.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
      html += '<div class="card" style="margin-top:16px"><h2>Slipped through</h2>' + (slip.length ? '<div class="list">' + slip.map(function (e) {
        var ago = daysBetween(parseDate(e.date), todayDate());
        var when = ago === 1 ? "yesterday" : plural(ago, "day") + " ago";
        if (e.kind === "due") return '<div class="item"><span class="grow"><strong>Job due: ' + esc(e.row.name) + '</strong> <span class="muted">' + esc(fmtDate(e.date)) + ", " + when + '</span></span><span class="tag red">overdue</span><button type="button" class="btn" data-goto-clients>Open in Clients</button></div>';
        var x = e.row;
        return '<div class="item"><span class="grow"><strong>' + esc(x.title) + "</strong>" + exPill(x) + ' <span class="muted">' + esc(x.type) + (clientName[x.client_id] ? ", " + esc(clientName[x.client_id]) : "") + ", " + esc(fmtDate(e.date)) + ", " + when + '</span></span><button type="button" class="btn" data-done="' + esc(x.id) + '">Mark done</button><button type="button" class="btn" data-item="' + esc(x.id) + '">Edit</button></div>';
      }).join("") + "</div>" : '<p class="empty">Nothing has slipped through. Nice work.</p>') + "</div>";
      root.innerHTML = html;

      var byId = {}; items.concat(slipped).forEach(function (x) { byId[x.id] = x; });
      var clientOptions = [{ value: "", label: "No client" }].concat(clients.map(function (c) { return { value: c.id, label: c.name }; }));
      function itemForm(x, date) {
        openForm({
          title: x ? "Edit calendar item" : "Add to calendar",
          values: x || { date: date || today(), type: "Create", status: "To do", client_id: calState.client || "" },
          fields: [
            { name: "title", label: "Title", required: true, full: true },
            { name: "type", label: "Type", type: "select", options: CAL_TYPES },
            { name: "client_id", label: "Client", type: "select", options: clientOptions },
            { name: "date", label: "Date", type: "date", required: true },
            { name: "status", label: "Status", type: "select", options: ["To do", "Done"] }
          ],
          onSave: function (v) {
            return x ? write(db.from("calendar").update(v).eq("id", x.id), "calendar", "Saved") : write(db.from("calendar").insert(v), "calendar", "Added to calendar");
          },
          onDelete: x ? function () { return write(db.from("calendar").delete().eq("id", x.id), "calendar", "Deleted"); } : null
        });
      }
      function openDay(day) {
        var list = itemsOn(day);
        openModal(fmtDate(day), '<div class="list">' + (list.length ? list.map(function (e) {
          if (e.kind === "due") return '<div class="item"><span class="grow"><strong>Job due: ' + esc(e.row.name) + '</strong></span><button type="button" class="btn" data-goto-clients>Open in Clients</button></div>';
          var x = e.row;
          return '<div class="item"><span class="grow"><strong>' + esc(x.title) + '</strong> <span class="muted">' + esc(x.type) + (clientName[x.client_id] ? ", " + esc(clientName[x.client_id]) : "") + ", " + esc(x.status) + '</span></span><button type="button" class="btn" data-day-edit="' + esc(x.id) + '">Edit</button></div>';
        }).join("") : '<p class="empty">Nothing on this day.</p>') + '</div><div class="form-actions"><div class="right"><button type="button" class="btn primary" data-day-add="' + day + '">' + ICON.plus + "Add on this day</button></div></div>");
        $("#modal-body").onclick = function (e) {
          var ed = e.target.closest("[data-day-edit]"), ad = e.target.closest("[data-day-add]"), gc = e.target.closest("[data-goto-clients]");
          if (ed) { closeModal(); itemForm(byId[ed.dataset.dayEdit]); }
          if (ad) { closeModal(); itemForm(null, ad.dataset.dayAdd); }
          if (gc) { closeModal(); go("clients"); }
        };
      }
      root.addEventListener("click", function (e) {
        var el;
        if ((el = e.target.closest("#cal-prev"))) { calState.month = shiftMonth(calState.month, -1); refresh(); return; }
        if ((el = e.target.closest("#cal-next"))) { calState.month = shiftMonth(calState.month, 1); refresh(); return; }
        if ((el = e.target.closest("#cal-today"))) { calState.month = thisMonth(); refresh(); return; }
        if ((el = e.target.closest("#cal-add"))) { itemForm(null); return; }
        if ((el = e.target.closest("[data-goto-clients]"))) { go("clients"); return; }
        if ((el = e.target.closest("[data-due]"))) { go("clients"); return; }
        if ((el = e.target.closest("[data-done]"))) { write(db.from("calendar").update({ status: "Done" }).eq("id", el.dataset.done), "calendar", "Marked as done").then(function (ok) { if (ok) refresh(); }); return; }
        if ((el = e.target.closest("[data-item]"))) { itemForm(byId[el.dataset.item]); return; }
        if ((el = e.target.closest("[data-more]"))) { openDay(el.dataset.more); return; }
        if ((el = e.target.closest("[data-add]"))) { itemForm(null, el.dataset.add); return; }
        if ((el = e.target.closest(".day"))) { itemForm(null, el.dataset.date); }
      });
      root.addEventListener("keydown", function (e) {
        var d = e.target.classList && e.target.classList.contains("day") ? e.target : null;
        if (d && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); itemForm(null, d.dataset.date); }
      });
      $("#cal-type", root).addEventListener("change", function (e) { calState.type = e.target.value; refresh(); });
      $("#cal-client", root).addEventListener("change", function (e) { calState.client = e.target.value; refresh(); });
    });
  }

  /* =================================================================
     5. RESULTS
     ================================================================= */
  var RESULT_FIELDS = [
    { name: "followers", label: "Followers" }, { name: "reach", label: "Reach" }, { name: "views", label: "Views" },
    { name: "interactions", label: "Interactions" }, { name: "profile_visits", label: "Profile visits" },
    { name: "link_clicks", label: "Link clicks" }, { name: "enquiries", label: "Enquiries" }
  ];
  var resState = { client: "", month: shiftMonth(thisMonth(), -1) };
  function renderResults(root) {
    return Promise.all([read("clients"), read("client_results", function (q) { return q.order("month", { ascending: true }); })]).then(function (r) {
      var clients = r[0].rows.slice().sort(function (a, b) { return (isFinished(a) - isFinished(b)) || String(a.name).localeCompare(String(b.name)); });
      var results = r[1].rows;
      if (!clients.length) {
        root.innerHTML = '<div class="card"><p class="empty">Add a client in "Clients and jobs" first, then you can log their monthly numbers here.</p></div>';
        return;
      }
      if (!resState.client || !clients.some(function (c) { return c.id === resState.client; })) resState.client = clients[0].id;
      var client = clients.filter(function (c) { return c.id === resState.client; })[0];
      var lastMonth = shiftMonth(thisMonth(), -1);
      var missingLast = clients.filter(function (c) {
        return !isFinished(c) && !c.is_example && !results.some(function (x) { return x.client_id === c.id && monthOf(x.month) === lastMonth; });
      });
      var mine = results.filter(function (x) { return x.client_id === client.id; }).sort(function (a, b) { return String(a.month).localeCompare(String(b.month)); });
      var byMonth = {}; mine.forEach(function (x) { byMonth[monthOf(x.month)] = x; });
      var row = byMonth[resState.month] || null;
      var prev = byMonth[shiftMonth(resState.month, -1)] || null;

      var html = "";
      html += missingLast.length
        ? '<div class="notice"><strong>Still to log for ' + esc(monthLabel(lastMonth)) + ":</strong>&nbsp;" + missingLast.map(function (c) { return esc(c.name); }).join(", ") + "</div>"
        : '<div class="notice info">All active clients have their ' + esc(monthLabel(lastMonth)) + " numbers logged.</div>";
      html += '<div class="toolbar"><select id="res-client" aria-label="Client">' + clients.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === client.id ? " selected" : "") + ">" + esc(c.name) + (isFinished(c) ? " (finished)" : "") + "</option>"; }).join("") + "</select>" +
        '<input type="month" id="res-month" value="' + esc(resState.month.slice(0, 7)) + '" aria-label="Month">' +
        '<div class="grow"></div><button type="button" class="btn" id="res-copy"' + (row ? "" : " disabled") + ">" + ICON.copy + 'Copy report summary</button><button type="button" class="btn" id="res-csv"' + (row ? "" : " disabled") + ">" + ICON.download + "Download for Canva</button></div>";
      var vals = row || {};
      html += '<div class="card inline-form"><div class="card-head"><h2>' + esc(client.name) + ", " + esc(monthLabel(resState.month)) + (row ? exPill(row) : ' <span class="muted">(not logged yet)</span>') + '</h2></div><form id="res-form" class="form-grid" novalidate>' +
        RESULT_FIELDS.map(function (f) {
          var c = prev ? change(vals[f.name], prev[f.name]) : null;
          return '<div class="field"><label for="r-' + f.name + '">' + f.label + (row && c ? " " + changeHTML(c) : "") + '</label><input id="r-' + f.name + '" name="' + f.name + '" type="number" min="0" step="1" value="' + esc(row ? n(vals[f.name]) : "") + '" placeholder="0"></div>';
        }).join("") +
        '<div class="field"><label for="r-top">Top post link</label><input id="r-top" name="top_post_link" type="url" value="' + esc(vals.top_post_link) + '" placeholder="https://..."></div>' +
        '<div class="field full"><label for="r-notes">Notes</label><textarea id="r-notes" name="notes">' + esc(vals.notes) + "</textarea></div></form>" +
        '<div class="form-actions">' + (row ? '<button type="button" class="btn danger" id="res-del">Delete this month</button>' : "") + '<div class="right"><button type="button" class="btn primary" id="res-save">Save numbers</button></div></div></div>';

      // History table and charts
      html += '<div class="grid-2"><div class="card"><h2>Followers</h2>' + lineChart(mine.map(function (x) { return monthShort(x.month); }), mine.map(function (x) { return x.followers; }), { label: "Followers over time", empty: "Once two or more months are logged for " + client.name + ", their followers will show here as a line." }) +
        '</div><div class="card"><h2>Reach</h2>' + lineChart(mine.map(function (x) { return monthShort(x.month); }), mine.map(function (x) { return x.reach; }), { color: "#DF982E", label: "Reach over time", empty: "Once two or more months are logged, reach over time will show here." }) + "</div></div>";
      html += '<div class="card"><h2>All months for ' + esc(client.name) + "</h2>" + (mine.length ? '<div class="table-wrap" style="box-shadow:none"><table><thead><tr><th>Month</th>' + RESULT_FIELDS.map(function (f) { return "<th>" + f.label + "</th>"; }).join("") + "</tr></thead><tbody>" +
        mine.slice().reverse().map(function (x) {
          var p = byMonth[shiftMonth(monthOf(x.month), -1)];
          return '<tr class="clickable" data-month="' + monthOf(x.month) + '"><td class="nowrap">' + esc(monthLabel(x.month)) + exPill(x) + "</td>" + RESULT_FIELDS.map(function (f) {
            return '<td class="nowrap">' + fmtNum(x[f.name]) + (p ? changeHTML(change(x[f.name], p[f.name])) : "") + "</td>";
          }).join("") + "</tr>";
        }).join("") + "</tbody></table></div>" : '<p class="empty">No months logged yet for ' + esc(client.name) + ". Fill in the form above and click \"Save numbers\".</p>") + "</div>";
      root.innerHTML = html;

      $("#res-client", root).addEventListener("change", function (e) { resState.client = e.target.value; refresh(); });
      $("#res-month", root).addEventListener("change", function (e) { if (e.target.value) { resState.month = e.target.value + "-01"; refresh(); } });
      root.addEventListener("click", function (e) {
        var tr = e.target.closest("tr[data-month]");
        if (tr) { resState.month = tr.dataset.month; refresh(); window.scrollTo({ top: 0, behavior: "smooth" }); }
      });
      $("#res-save", root).addEventListener("click", function () {
        var f = $("#res-form", root), v = { client_id: client.id, month: resState.month };
        RESULT_FIELDS.forEach(function (x) { v[x.name] = Math.max(0, Math.round(n(f.elements[x.name].value))); });
        v.top_post_link = f.elements.top_post_link.value.trim() || null;
        v.notes = f.elements.notes.value.trim() || null;
        write(db.from("client_results").upsert(v, { onConflict: "client_id,month" }), "client_results", "Numbers saved").then(function (ok) { if (ok) refresh(); });
      });
      var del = $("#res-del", root);
      if (del) del.addEventListener("click", function () {
        if (!del.classList.contains("confirm")) { del.classList.add("confirm"); del.textContent = "Click again to delete"; return; }
        write(db.from("client_results").delete().eq("id", row.id), "client_results", "Month deleted").then(function (ok) { if (ok) refresh(); });
      });
      function compareLine(label, cur, p) {
        var c = p ? change(cur, p) : null;
        var txt = label + ": " + fmtNum(cur);
        if (c) txt += c.diff === 0 ? " (no change on " + monthLabel(shiftMonth(resState.month, -1)) + ")" : " (" + (c.diff > 0 ? "up " : "down ") + fmtNum(Math.abs(c.diff)) + (c.pct !== null ? ", " + (c.diff > 0 ? "+" : "-") + Math.abs(c.pct).toFixed(1) + "%" : "") + " on " + monthLabel(shiftMonth(resState.month, -1)) + ")";
        return txt;
      }
      var copyBtn = $("#res-copy", root);
      if (copyBtn) copyBtn.addEventListener("click", function () {
        if (!row) return;
        var lines = ["Monthly report", "Client: " + client.name, "Month: " + monthLabel(resState.month), ""];
        RESULT_FIELDS.forEach(function (f) { lines.push(compareLine(f.label, row[f.name], prev ? prev[f.name] : null)); });
        if (!prev) lines.push("", "(No numbers logged for " + monthLabel(shiftMonth(resState.month, -1)) + " to compare with.)");
        if (row.top_post_link) lines.push("", "Top post: " + row.top_post_link);
        if (row.notes) lines.push("", "Notes: " + row.notes);
        copyText(lines.join("\n")).then(function (ok) { toast(ok ? "Summary copied, paste it into Canva" : "Couldn't copy, please try again", !ok); });
      });
      var csvBtn = $("#res-csv", root);
      if (csvBtn) csvBtn.addEventListener("click", function () {
        if (!row) return;
        var headers = ["Client", "Month"], vals2 = [client.name, monthLabel(resState.month)];
        RESULT_FIELDS.forEach(function (f) {
          var c = prev ? change(row[f.name], prev[f.name]) : null;
          headers.push(f.label, f.label + " change", f.label + " change %");
          vals2.push(n(row[f.name]), c ? (c.diff > 0 ? "+" : c.diff < 0 ? "-" : "") + fmtNum(Math.abs(c.diff)) : "", c && c.pct !== null ? (c.diff > 0 ? "+" : c.diff < 0 ? "-" : "") + Math.abs(c.pct).toFixed(1) + "%" : "");
        });
        headers.push("Top post link", "Notes", "Compared with");
        vals2.push(row.top_post_link || "", row.notes || "", prev ? monthLabel(shiftMonth(resState.month, -1)) : "");
        var slug = String(client.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        downloadCSV("canva-report-" + slug + "-" + resState.month.slice(0, 7) + ".csv", headers, [vals2]);
      });
    });
  }

  /* =================================================================
     6. CHECKLISTS
     ================================================================= */
  var chkState = { tab: "onboarding", client: "", month: thisMonth(), open: {} };
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function tickKey(list, clientId, month, section, item) { return [list, clientId, list === "monthly" ? month.slice(0, 7) : "all", slug(section), slug(item)].join("|"); }
  function renderChecklists(root) {
    var lib = window.Library;
    if (!lib || !lib.ONBOARDING || !lib.MONTHLY) {
      root.innerHTML = '<div class="notice error"><strong>The checklist templates didn\'t load.</strong>&nbsp;Check that js/library.js is on your site.</div>';
      return Promise.resolve();
    }
    return Promise.all([read("clients"), read("ticks")]).then(function (r) {
      var clients = r[0].rows.slice().sort(function (a, b) { return (isFinished(a) - isFinished(b)) || String(a.name).localeCompare(String(b.name)); });
      var ticks = {}; r[1].rows.forEach(function (t) { if (t.done) ticks[t.key] = true; });
      var activeClients = clients.filter(function (c) { return !isFinished(c); });
      if (!clients.length) {
        root.innerHTML = '<div class="card"><p class="empty">Add a client in "Clients and jobs" first, then their checklists will appear here.</p></div>';
        return;
      }
      if (!chkState.client || !clients.some(function (c) { return c.id === chkState.client; })) chkState.client = (activeClients[0] || clients[0]).id;
      function template() { return chkState.tab === "monthly" ? lib.MONTHLY : lib.ONBOARDING; }
      function progressFor(clientId, section) {
        var secs = section ? [section] : template();
        var total = 0, done = 0;
        secs.forEach(function (s) { (s.items || []).forEach(function (it) { total++; if (ticks[tickKey(chkState.tab, clientId, chkState.month, s.title, it)]) done++; }); });
        return { total: total, done: done, pct: total ? done / total * 100 : 0 };
      }
      function draw() {
        var html = '<div class="sub-tabs" role="tablist"><button type="button" role="tab" data-sub="onboarding" aria-selected="' + (chkState.tab === "onboarding") + '">Client onboarding</button><button type="button" role="tab" data-sub="monthly" aria-selected="' + (chkState.tab === "monthly") + '">Monthly workflow</button></div>';
        html += '<div class="card"><h2>' + (chkState.tab === "monthly" ? "Everyone's progress for " + esc(monthLabel(chkState.month)) : "Everyone's onboarding progress") + "</h2>" +
          (activeClients.length ? '<div class="overview">' + activeClients.map(function (c) {
            var p = progressFor(c.id);
            return '<button type="button" data-pick="' + esc(c.id) + '" aria-pressed="' + (c.id === chkState.client) + '"><span class="row"><span>' + esc(c.name) + '</span><span class="pct">' + p.done + "/" + p.total + "</span></span>" + progressBar(p.pct) + "</button>";
          }).join("") + "</div>" : '<p class="empty">No active clients right now.</p>') + "</div>";
        html += '<div class="toolbar"><select id="chk-client" aria-label="Client">' + clients.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === chkState.client ? " selected" : "") + ">" + esc(c.name) + (isFinished(c) ? " (finished)" : "") + "</option>"; }).join("") + "</select>" +
          (chkState.tab === "monthly" ? '<input type="month" id="chk-month" value="' + esc(chkState.month.slice(0, 7)) + '" aria-label="Month">' : "") + "</div>";
        var overall = progressFor(chkState.client);
        html += '<div class="card"><div class="card-head"><h2>Overall</h2><span class="muted">' + overall.done + " of " + overall.total + " done (" + Math.round(overall.pct) + "%)</span></div>" + progressBar(overall.pct) + "</div>";
        template().forEach(function (s, si) {
          var p = progressFor(chkState.client, s);
          var openKey = chkState.tab + "|" + s.title;
          var isOpen = chkState.open[openKey] !== undefined ? chkState.open[openKey] : true;
          html += '<details class="section" data-open-key="' + esc(openKey) + '"' + (isOpen ? " open" : "") + "><summary><span>" + esc(s.title) + "</span>" + progressBar(p.pct) + '<span class="count">' + p.done + "/" + p.total + '</span></summary><div class="items">' +
            (s.items || []).map(function (it) {
              var k = tickKey(chkState.tab, chkState.client, chkState.month, s.title, it);
              return '<label class="check"><input type="checkbox" data-key="' + esc(k) + '"' + (ticks[k] ? " checked" : "") + "><span>" + esc(it) + "</span></label>";
            }).join("") + "</div></details>";
        });
        root.innerHTML = html;
      }
      draw();
      root.addEventListener("click", function (e) {
        var sub = e.target.closest("[data-sub]"), pick = e.target.closest("[data-pick]");
        if (sub) { chkState.tab = sub.dataset.sub; draw(); }
        if (pick) { chkState.client = pick.dataset.pick; draw(); }
      });
      root.addEventListener("toggle", function (e) {
        var d = e.target.closest && e.target.closest("details[data-open-key]");
        if (d) chkState.open[d.dataset.openKey] = d.open;
      }, true);
      root.addEventListener("change", function (e) {
        if (e.target.id === "chk-client") { chkState.client = e.target.value; draw(); return; }
        if (e.target.id === "chk-month") { if (e.target.value) { chkState.month = e.target.value + "-01"; draw(); } return; }
        var key = e.target.dataset && e.target.dataset.key;
        if (!key) return;
        var on = e.target.checked;
        if (on) ticks[key] = true; else delete ticks[key];
        draw();
        var job = on ? db.from("ticks").upsert({ key: key, done: true, updated_at: new Date().toISOString() }, { onConflict: "key" }) : db.from("ticks").delete().eq("key", key);
        write(job, "ticks").then(function (ok) {
          if (!ok) { if (on) delete ticks[key]; else ticks[key] = true; draw(); }
        });
      });
    });
  }

  /* =================================================================
     7. MY NUMBERS
     ================================================================= */
  var MY_FIELDS = [
    { name: "followers", label: "Followers" }, { name: "reach", label: "Reach" }, { name: "views", label: "Views" },
    { name: "profile_visits", label: "Profile visits" }, { name: "link_clicks", label: "Link clicks" }
  ];
  var myState = { month: thisMonth() };
  function renderNumbers(root) {
    return Promise.all([
      read("my_numbers", function (q) { return q.order("month", { ascending: true }); }),
      read("contacts")
    ]).then(function (r) {
      var rows = r[0].rows, contacts = r[1].rows.filter(function (c) { return !c.is_example; });
      var byMonth = {}; rows.forEach(function (x) { byMonth[monthOf(x.month)] = x; });
      var tm = thisMonth();
      var latest = rows.length ? rows[rows.length - 1] : null;
      var cur = byMonth[tm], prevOfCur = byMonth[shiftMonth(tm, -1)];
      var growth = cur && prevOfCur ? change(cur.followers, prevOfCur.followers) : null;
      var leadsThis = contacts.filter(function (c) { return monthOf(c.created_at) === tm; }).length;

      var html = '<div class="strip">' +
        stat("Current followers", latest ? fmtNum(latest.followers) : "0", latest ? "as of " + esc(monthLabel(latest.month)) : "Nothing logged yet") +
        stat("Follower growth this month", growth ? (growth.diff > 0 ? "+" : growth.diff < 0 ? "-" : "") + fmtNum(Math.abs(growth.diff)) : "0", growth ? (growth.pct !== null ? (growth.diff >= 0 ? "+" : "-") + Math.abs(growth.pct).toFixed(1) + "% on last month" : "first month with followers") : (cur ? "log last month too to compare" : "this month not logged yet")) +
        stat("Reach this month", cur ? fmtNum(cur.reach) : "0", cur ? "" : "this month not logged yet") +
        stat("Leads this month", fmtNum(leadsThis), "from your Leads list") +
        "</div>";
      var row = byMonth[myState.month] || null;
      var vals = row || {};
      html += '<div class="card inline-form"><div class="card-head"><h2>Log my numbers</h2><input type="month" id="my-month" value="' + esc(myState.month.slice(0, 7)) + '" aria-label="Month"></div><form id="my-form" class="form-grid" novalidate>' +
        MY_FIELDS.map(function (f) { return '<div class="field"><label for="m-' + f.name + '">' + f.label + '</label><input id="m-' + f.name + '" name="' + f.name + '" type="number" min="0" step="1" value="' + esc(row ? n(vals[f.name]) : "") + '" placeholder="0"></div>'; }).join("") +
        '<div class="field full"><label for="m-notes">Notes</label><textarea id="m-notes" name="notes">' + esc(vals.notes) + "</textarea></div></form>" +
        '<div class="form-actions">' + (row ? '<button type="button" class="btn danger" id="my-del">Delete this month</button>' : "") + '<div class="right"><span class="muted" style="align-self:center">' + esc(monthLabel(myState.month)) + (row ? exPill(row) : " (not logged yet)") + '</span><button type="button" class="btn primary" id="my-save">Save</button></div></div></div>';

      // Leads per month for the last 12 months, straight from your Leads list
      var months = [], leadCounts = [];
      for (var i = 11; i >= 0; i--) { months.push(shiftMonth(tm, -i)); leadCounts.push(0); }
      contacts.forEach(function (c) { var idx = months.indexOf(monthOf(c.created_at)); if (idx > -1) leadCounts[idx]++; });
      html += '<div class="grid-2"><div class="card"><h2>Followers</h2>' + lineChart(rows.map(function (x) { return monthShort(x.month); }), rows.map(function (x) { return x.followers; }), { label: "Followers over time", empty: "Log your numbers for two or more months and your follower growth will show here as a line." }) +
        '</div><div class="card"><h2>Reach</h2>' + lineChart(rows.map(function (x) { return monthShort(x.month); }), rows.map(function (x) { return x.reach; }), { color: "#DF982E", label: "Reach over time", empty: "Log two or more months and your reach over time will show here." }) + "</div></div>";
      html += '<div class="card"><h2>Leads per month</h2>' + barChart(months.map(monthShort), leadCounts, { color: "#294268", label: "Leads per month", empty: "When leads start arriving through your site or you add them in Leads, each month's total will show here." }) + "</div>";
      html += '<div class="card"><h2>All months</h2>' + (rows.length ? '<div class="table-wrap" style="box-shadow:none"><table><thead><tr><th>Month</th>' + MY_FIELDS.map(function (f) { return "<th>" + f.label + "</th>"; }).join("") + "<th>Notes</th></tr></thead><tbody>" +
        rows.slice().reverse().map(function (x) {
          var p = byMonth[shiftMonth(monthOf(x.month), -1)];
          return '<tr class="clickable" data-month="' + monthOf(x.month) + '"><td class="nowrap">' + esc(monthLabel(x.month)) + exPill(x) + "</td>" + MY_FIELDS.map(function (f) { return '<td class="nowrap">' + fmtNum(x[f.name]) + (p ? changeHTML(change(x[f.name], p[f.name])) : "") + "</td>"; }).join("") + '<td class="clip" title="' + esc(x.notes) + '">' + esc(x.notes) + "</td></tr>";
        }).join("") + "</tbody></table></div>" : '<p class="empty">No months logged yet. Fill in the form above once a month.</p>') + "</div>";
      root.innerHTML = html;

      $("#my-month", root).addEventListener("change", function (e) { if (e.target.value) { myState.month = e.target.value + "-01"; refresh(); } });
      root.addEventListener("click", function (e) { var tr = e.target.closest("tr[data-month]"); if (tr) { myState.month = tr.dataset.month; refresh(); window.scrollTo({ top: 0, behavior: "smooth" }); } });
      $("#my-save", root).addEventListener("click", function () {
        var f = $("#my-form", root), v = { month: myState.month };
        MY_FIELDS.forEach(function (x) { v[x.name] = Math.max(0, Math.round(n(f.elements[x.name].value))); });
        v.notes = f.elements.notes.value.trim() || null;
        write(db.from("my_numbers").upsert(v, { onConflict: "month" }), "my_numbers", "Saved").then(function (ok) { if (ok) refresh(); });
      });
      var del = $("#my-del", root);
      if (del) del.addEventListener("click", function () {
        if (!del.classList.contains("confirm")) { del.classList.add("confirm"); del.textContent = "Click again to delete"; return; }
        write(db.from("my_numbers").delete().eq("id", row.id), "my_numbers", "Month deleted").then(function (ok) { if (ok) refresh(); });
      });
    });
  }


  /* =================================================================
     8. INSPIRATION (my content)
     Videos you like, with their transcript, your notes and "My version".
     ================================================================= */
  var INS_FORMATS = ["Reel", "Short", "Long video"];
  var INS_STATUS = ["Saved", "To adapt", "Used"];
  var INS_STATUS_COLOUR = { "Saved": "navy", "To adapt": "gold", "Used": "green" };
  var PLATFORM_COLOUR = { "YouTube": "red", "Instagram": "purple", "TikTok": "dark", "Other": "" };
  var insState = { view: "grid", id: null, q: "", platform: "", pillar: "", status: "", fav: false, picked: {} };

  function safeLink(url) { return /^https?:\/\//i.test(String(url || "").trim()) ? String(url).trim() : ""; }
  function detectPlatform(url) {
    var u; try { u = new URL(String(url || "").trim()); } catch (e) { return ""; }
    var h = u.hostname.toLowerCase().replace(/^(www\.|m\.|vm\.|vt\.)/, "");
    if (h === "youtu.be" || /(^|\.)youtube\.com$/.test(h)) return "YouTube";
    if (h === "instagr.am" || /(^|\.)instagram\.com$/.test(h)) return "Instagram";
    if (/(^|\.)tiktok\.com$/.test(h)) return "TikTok";
    return "Other";
  }
  // Works out the official embed address for each platform, or null if it can't be embedded
  function embedFor(url) {
    var u; try { u = new URL(String(url || "").trim()); } catch (e) { return null; }
    var p = detectPlatform(url), path = u.pathname, m;
    if (p === "YouTube") {
      var id = "";
      if (/youtu\.be$/i.test(u.hostname)) id = path.split("/")[1] || "";
      else if (u.searchParams.get("v")) id = u.searchParams.get("v");
      else if ((m = path.match(/\/(shorts|live|embed)\/([\w-]{11})/))) id = m[2];
      if (!/^[\w-]{11}$/.test(id)) return null;
      return { src: "https://www.youtube-nocookie.com/embed/" + id, tall: /\/shorts\//.test(path) };
    }
    if (p === "Instagram" && (m = path.match(/\/(p|reel|reels|tv)\/([\w-]+)/))) {
      return { src: "https://www.instagram.com/" + (m[1] === "p" ? "p" : "reel") + "/" + m[2] + "/embed/", tall: true, ig: true };
    }
    if (p === "TikTok" && (m = path.match(/\/video\/(\d+)/))) {
      return { src: "https://www.tiktok.com/embed/v2/" + m[1], tall: true };
    }
    return null;
  }
  function guessCreator(url) {
    var m = String(url || "").match(/\/(@[\w.\-]+)/);
    if (m) return m[1];
    // Newer Instagram links: instagram.com/username/reel/CODE/
    m = String(url || "").match(/instagram\.com\/([\w.]+)\/(?:reel|reels|p|tv)\//i);
    return m ? "@" + m[1] : "";
  }
  function guessFormat(url) {
    var p = detectPlatform(url);
    if (p === "YouTube") return /\/shorts\//.test(url) ? "Short" : "Long video";
    if (p === "Instagram" || p === "TikTok") return "Reel";
    return "";
  }
  function tokscriptLink(url) { return "https://tokscript.com/" + String(url || "").trim().replace(/^https?:\/\//i, ""); }
  // Removes timestamps like 00:01, [0:05], 00:00:01,000 --> 00:00:03,000 and subtitle numbers
  var TIME = "\\d{1,2}:\\d{2}(?::\\d{2})?(?:[.,]\\d{1,3})?";
  function hasTimestamps(t) { return new RegExp(TIME).test(t || ""); }
  function cleanTranscript(t) {
    var lines = String(t || "").replace(/\r/g, "").split("\n");
    var out = [], para = [];
    lines.forEach(function (line) {
      if (/^\s*WEBVTT/i.test(line) || /^\s*\d+\s*$/.test(line)) return;
      var l = line
        .replace(new RegExp(TIME + "\\s*-->\\s*" + TIME, "g"), "")
        .replace(new RegExp("[\\[(]?\\s*" + TIME + "\\s*[\\])]?\\s*[-\u2013:]?\\s*", "g"), "")
        .replace(/\s+/g, " ").trim();
      if (!l) { if (para.length) { out.push(para.join(" ")); para = []; } return; }
      para.push(l);
    });
    if (para.length) out.push(para.join(" "));
    return out.join("\n\n").trim();
  }
  function platformPill(p) { return p ? '<span class="pill ' + (PLATFORM_COLOUR[p] || "") + '">' + esc(p) + "</span>" : ""; }

  function renderInspiration(root) {
    return read("inspiration", function (q) { return q.order("created_at", { ascending: false }); }).then(function (r) {
      var all = r.rows, missingTable = !r.ok;
      var byId = {}; all.forEach(function (x) { byId[x.id] = x; });
      if (insState.view === "detail" && byId[insState.id]) return drawDetail(root, byId[insState.id], all);
      insState.view = "grid";
      drawGrid(root, all, missingTable);
    });
  }

  function drawGrid(root, all, missingTable) {
    var pillars = all.map(function (x) { return x.pillar; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort();
    function filtered() {
      var q = insState.q.toLowerCase().replace(/^@/, "");
      return all.filter(function (x) {
        if (insState.platform && x.platform !== insState.platform) return false;
        if (insState.pillar && x.pillar !== insState.pillar) return false;
        if (insState.status && x.status !== insState.status) return false;
        if (insState.fav && !x.favourite) return false;
        if (!q) return true;
        return [x.transcript, x.hook, x.notes, x.creator].some(function (v) { return v && String(v).toLowerCase().replace(/(^|\s)@/g, "$1").indexOf(q) > -1; });
      });
    }
    var html = '<div class="toolbar"><div class="grow"><input type="search" id="ins-q" placeholder="Search transcripts, hooks, notes and creators" value="' + esc(insState.q) + '" aria-label="Search"></div>' +
      '<select id="ins-platform" aria-label="Filter by platform"><option value="">All platforms</option>' + ["YouTube", "Instagram", "TikTok", "Other"].map(function (p) { return "<option" + (insState.platform === p ? " selected" : "") + ">" + p + "</option>"; }).join("") + "</select>" +
      '<select id="ins-pillar" aria-label="Filter by pillar"><option value="">All pillars</option>' + pillars.map(function (p) { return '<option value="' + esc(p) + '"' + (insState.pillar === p ? " selected" : "") + ">" + esc(p) + "</option>"; }).join("") + "</select>" +
      '<select id="ins-status" aria-label="Filter by status"><option value="">All statuses</option>' + INS_STATUS.map(function (s) { return "<option" + (insState.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>" +
      '<button type="button" class="btn' + (insState.fav ? " on-fav" : "") + '" id="ins-fav" aria-pressed="' + insState.fav + '">' + ICON.star + "Favourites</button></div>" +
      '<div class="toolbar"><button type="button" class="btn primary" id="ins-add">' + ICON.plus + 'Add video</button><div class="grow"></div>' +
      '<span class="muted" id="ins-picked-count"></span><button type="button" class="btn" id="ins-copy">' + ICON.copy + 'Copy for Claude</button><button type="button" class="btn" id="ins-csv">' + ICON.download + "Download</button></div>" +
      '<div id="ins-list"></div>';
    root.innerHTML = html;

    function drawList() {
      var list = filtered();
      var box = $("#ins-list", root);
      if (!all.length) {
        box.innerHTML = '<div class="card"><p class="empty">' + (missingTable
          ? "Your Inspiration list will appear here once the inspiration table is set up in Supabase (see the note at the top)."
          : "This is your swipe file. Save videos you love from YouTube, Instagram and TikTok, paste their transcript, and note what makes them work and how you'd make your own version. Click \"Add video\" to save the first one.") + "</p></div>";
      } else if (!list.length) {
        box.innerHTML = '<div class="card"><p class="empty">No videos match your search or filters.</p></div>';
      } else {
        box.innerHTML = '<div class="ins-grid">' + list.map(function (x) {
          var picked = !!insState.picked[x.id];
          return '<article class="ins-card' + (picked ? " picked" : "") + '" data-id="' + esc(x.id) + '" tabindex="0" aria-label="' + esc((x.creator || "Video") + ": " + (x.hook || "")) + '">' +
            '<div class="ins-top"><label class="ins-tick" title="Tick to include in Copy for Claude"><input type="checkbox" data-pick="' + esc(x.id) + '"' + (picked ? " checked" : "") + '><span class="sr-only">Select</span></label>' +
            platformPill(x.platform) + exPill(x) + '<span class="grow"></span><button type="button" class="icon-btn' + (x.favourite ? " on" : "") + '" data-fav="' + esc(x.id) + '" aria-pressed="' + !!x.favourite + '" aria-label="' + (x.favourite ? "Remove from favourites" : "Add to favourites") + '">' + ICON.star + "</button></div>" +
            '<div class="ins-creator">' + esc(x.creator || "Unknown creator") + "</div>" +
            '<p class="ins-hook">' + (x.hook ? esc(x.hook) : '<span class="muted">No hook written yet</span>') + "</p>" +
            '<div class="ins-meta">' + pill(x.status || "Saved", INS_STATUS_COLOUR[x.status || "Saved"]) + (x.format ? '<span class="muted">' + esc(x.format) + "</span>" : "") + (x.pillar ? '<span class="muted">' + esc(x.pillar) + "</span>" : "") + (x.transcript ? "" : '<span class="tag yellow">no transcript</span>') + "</div></article>";
        }).join("") + "</div>";
      }
      var n = Object.keys(insState.picked).filter(function (k) { return insState.picked[k]; }).length;
      $("#ins-picked-count", root).textContent = n ? n + " ticked" : "Tick videos to copy them";
      $("#ins-copy", root).disabled = n === 0;
    }
    drawList();

    $("#ins-q", root).addEventListener("input", function (e) { insState.q = e.target.value; drawList(); });
    $("#ins-platform", root).addEventListener("change", function (e) { insState.platform = e.target.value; drawList(); });
    $("#ins-pillar", root).addEventListener("change", function (e) { insState.pillar = e.target.value; drawList(); });
    $("#ins-status", root).addEventListener("change", function (e) { insState.status = e.target.value; drawList(); });
    $("#ins-fav", root).addEventListener("click", function (e) {
      insState.fav = !insState.fav;
      e.currentTarget.setAttribute("aria-pressed", String(insState.fav));
      e.currentTarget.classList.toggle("on-fav", insState.fav);
      drawList();
    });
    var byId = {}; all.forEach(function (x) { byId[x.id] = x; });
    $("#ins-list", root).addEventListener("click", function (e) {
      var pick = e.target.closest("[data-pick]");
      if (pick) { insState.picked[pick.dataset.pick] = pick.checked; drawList(); return; }
      if (e.target.closest(".ins-tick")) return;
      var fav = e.target.closest("[data-fav]");
      if (fav) {
        var x = byId[fav.dataset.fav];
        write(db.from("inspiration").update({ favourite: !x.favourite }).eq("id", x.id), "inspiration").then(function (ok) { if (ok) { x.favourite = !x.favourite; drawList(); } });
        return;
      }
      var card = e.target.closest(".ins-card");
      if (card) { insState.view = "detail"; insState.id = card.dataset.id; refresh(); window.scrollTo({ top: 0 }); }
    });
    $("#ins-list", root).addEventListener("keydown", function (e) {
      var card = e.target.classList && e.target.classList.contains("ins-card") ? e.target : null;
      if (card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); insState.view = "detail"; insState.id = card.dataset.id; refresh(); }
    });

    // Add video
    $("#ins-add", root).addEventListener("click", function () {
      openForm({
        title: "Add video",
        saveLabel: "Save video",
        values: { status: "Saved" },
        fields: [
          { name: "link", label: "Paste the video link", type: "url", required: true, full: true, placeholder: "https://www.instagram.com/reel/...", help: "YouTube, Instagram or TikTok. The platform is detected by itself." },
          { name: "creator", label: "Creator's @", placeholder: "@creator" },
          { name: "format", label: "Format", type: "select", options: [{ value: "", label: "Choose..." }].concat(INS_FORMATS) },
          { name: "hook", label: "Hook (the first line)", full: true },
          { name: "pillar", label: "Content pillar", list: pillars },
          { name: "status", label: "Status", type: "select", options: INS_STATUS }
        ],
        onSave: function (v) {
          var link = safeLink(v.link);
          if (!link) { $("#form-error").textContent = "Please paste a full link that starts with https://"; return Promise.resolve(false); }
          v.link = link;
          v.platform = detectPlatform(link) || "Other";
          if (!v.creator) v.creator = guessCreator(link) || null;
          if (v.creator && v.creator.charAt(0) !== "@") v.creator = "@" + v.creator;
          if (!v.format) v.format = guessFormat(link) || null;
          return Promise.resolve(db.from("inspiration").insert(v).select("id").single()).then(function (res) {
            if (res.error) { explain(res.error, "inspiration"); toast("Couldn't save: " + (res.error.message || "please try again"), true); return false; }
            toast("Video saved. Now add the transcript.");
            insState.view = "detail"; insState.id = res.data && res.data.id;
            return true;
          }, function () { toast("Couldn't save, please try again.", true); return false; });
        }
      });
      // Show the platform as soon as a link is pasted
      var linkInput = $("#f-link"), help = linkInput && linkInput.parentNode.querySelector(".help");
      if (linkInput && help) linkInput.addEventListener("input", function () {
        var p = detectPlatform(linkInput.value);
        help.innerHTML = p ? "Detected: " + platformPill(p) : "YouTube, Instagram or TikTok. The platform is detected by itself.";
        var c = $("#f-creator"), f = $("#f-format");
        if (c && !c.value) c.value = guessCreator(linkInput.value);
        if (f && !f.value) f.value = guessFormat(linkInput.value);
      });
    });

    // Copy for Claude
    $("#ins-copy", root).addEventListener("click", function () {
      var picked = all.filter(function (x) { return insState.picked[x.id]; });
      if (!picked.length) return;
      var lines = ["Here " + (picked.length === 1 ? "is 1 video" : "are " + picked.length + " videos") + " I saved for inspiration for The Gemini Social (social media management for small businesses). Tell me what is working in them and give me new content ideas I could adapt.", ""];
      picked.forEach(function (x, i) {
        lines.push("### Video " + (i + 1));
        lines.push("Link: " + (x.link || ""));
        lines.push("Platform: " + (x.platform || ""));
        lines.push("Creator: " + (x.creator || ""));
        lines.push("Hook: " + (x.hook || ""));
        if (x.format) lines.push("Format: " + x.format);
        if (x.pillar) lines.push("Content pillar: " + x.pillar);
        lines.push("", "Transcript:", x.transcript ? cleanTranscript(x.transcript) || x.transcript : "(no transcript yet)");
        lines.push("", "My notes:", x.notes || "(no notes yet)");
        if (x.my_version) lines.push("", "My version so far:", x.my_version);
        lines.push("");
      });
      copyText(lines.join("\n")).then(function (ok) { toast(ok ? "Copied " + plural(picked.length, "video") + ". Paste it into Claude." : "Couldn't copy, please try again", !ok); });
    });

    // Download the whole list
    $("#ins-csv", root).addEventListener("click", function () {
      if (!all.length) { toast("There's nothing to download yet"); return; }
      downloadCSV("inspiration-" + today() + ".csv",
        ["Link", "Platform", "Creator", "Hook", "Format", "Content pillar", "Status", "Favourite", "Transcript", "Notes", "My version", "Saved on"],
        all.map(function (x) { return [x.link, x.platform, x.creator, x.hook, x.format, x.pillar, x.status, x.favourite ? "Yes" : "No", x.transcript, x.notes, x.my_version, fmtDate(x.created_at)]; }));
    });
  }

  function drawDetail(root, x, all) {
    var pillars = all.map(function (i) { return i.pillar; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort();
    var link = safeLink(x.link);
    var emb = embedFor(link);
    var player = emb
      ? '<div class="embed-box' + (emb.tall ? " tall" : "") + (emb.ig ? " ig" : "") + '"><iframe src="' + esc(emb.src) + '" title="' + esc((x.platform || "Video") + " video" + (x.creator ? " by " + x.creator : "")) + '" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'
      : '<div class="embed-box empty-embed"><p>This video can\'t be shown here' + (x.platform === "TikTok" ? " (short TikTok links can't be embedded, use the full link with /video/ in it)" : "") + ".</p>" + (link ? '<a class="btn primary" href="' + esc(link) + '" target="_blank" rel="noopener">Open video</a>' : "") + "</div>";
    var html = '<div class="toolbar"><button type="button" class="btn" id="ins-back">' + ICON.left + 'All videos</button><div class="grow"></div><span class="muted" id="ins-dirty"></span>' +
      '<button type="button" class="btn danger" id="ins-del">Delete</button><button type="button" class="btn primary" id="ins-save">Save changes</button></div>' +
      '<div class="ins-detail"><div class="ins-left"><div class="card">' +
      '<div class="ins-top">' + platformPill(x.platform) + exPill(x) + '<span class="grow"></span><button type="button" class="icon-btn' + (x.favourite ? " on" : "") + '" id="ins-star" aria-pressed="' + !!x.favourite + '" aria-label="Favourite">' + ICON.star + "</button></div>" +
      player +
      '<div class="ins-links">' + (link ? '<a class="btn" href="' + esc(link) + '" target="_blank" rel="noopener">Open video</a><a class="btn" href="' + esc(tokscriptLink(link)) + '" target="_blank" rel="noopener">Open in TokScript</a>' : "") + "</div>" +
      '<p class="ins-link-text">' + esc(link) + "</p>" +
      "</div></div>" +
      '<div class="ins-right"><form id="ins-form" novalidate>' +
      '<div class="card"><div class="form-grid">' +
      fieldHTML({ name: "creator", label: "Creator's @", placeholder: "@creator" }, x.creator) +
      fieldHTML({ name: "format", label: "Format", type: "select", options: [{ value: "", label: "Choose..." }].concat(INS_FORMATS) }, x.format) +
      fieldHTML({ name: "hook", label: "Hook (the first line)", full: true }, x.hook) +
      fieldHTML({ name: "pillar", label: "Content pillar", list: pillars }, x.pillar) +
      fieldHTML({ name: "status", label: "Status", type: "select", options: INS_STATUS }, x.status || "Saved") +
      "</div></div>" +
      '<div class="card"><div class="card-head"><h2>Script (transcript)</h2><div class="ins-tools"><button type="button" class="btn" id="ins-paste">' + ICON.copy + 'Paste transcript</button><button type="button" class="btn" id="ins-clean">Clean text</button></div></div>' +
      '<textarea class="big-text" name="transcript" id="ins-transcript" placeholder="Paste the transcript here. Tip: click &quot;Open in TokScript&quot;, copy the transcript there, then click &quot;Paste transcript&quot;.">' + esc(x.transcript) + "</textarea></div>" +
      '<div class="card"><h2>My notes</h2><textarea class="mid-text" name="notes" placeholder="What did you like? Why does it work? Hook, pacing, visuals, call to action...">' + esc(x.notes) + "</textarea></div>" +
      '<div class="card"><h2>My version</h2><textarea class="mid-text" name="my_version" placeholder="How would you adapt this idea for The Gemini Social or a client?">' + esc(x.my_version) + "</textarea></div>" +
      "</form></div></div>";
    root.innerHTML = html;

    var form = $("#ins-form", root), dirty = false, fav = !!x.favourite;
    function markDirty(on) { dirty = on; $("#ins-dirty", root).textContent = on ? "Unsaved changes" : ""; }
    form.addEventListener("input", function () { markDirty(true); });
    function collect() {
      var v = {};
      ["creator", "hook", "pillar", "transcript", "notes", "my_version"].forEach(function (k) { var val = form.elements[k].value.trim(); v[k] = val || null; });
      if (v.creator && v.creator.charAt(0) !== "@") v.creator = "@" + v.creator;
      v.format = form.elements.format.value || null;
      v.status = form.elements.status.value || "Saved";
      v.favourite = fav;
      return v;
    }
    function save() {
      var btn = $("#ins-save", root);
      btn.disabled = true; btn.textContent = "Saving...";
      return write(db.from("inspiration").update(collect()).eq("id", x.id), "inspiration", "Saved").then(function (ok) {
        btn.disabled = false; btn.textContent = "Save changes";
        if (ok) markDirty(false);
        return ok;
      });
    }
    $("#ins-save", root).addEventListener("click", save);
    root.addEventListener("keydown", function (e) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); } });
    $("#ins-back", root).addEventListener("click", function () {
      if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) return;
      insState.view = "grid"; insState.id = null; refresh();
    });
    $("#ins-star", root).addEventListener("click", function (e) {
      fav = !fav;
      e.currentTarget.classList.toggle("on", fav);
      e.currentTarget.setAttribute("aria-pressed", String(fav));
      write(db.from("inspiration").update({ favourite: fav }).eq("id", x.id), "inspiration", fav ? "Added to favourites" : "Removed from favourites");
    });
    var del = $("#ins-del", root);
    del.addEventListener("click", function () {
      if (!del.classList.contains("confirm")) { del.classList.add("confirm"); del.textContent = "Click again to delete"; return; }
      write(db.from("inspiration").delete().eq("id", x.id), "inspiration", "Video deleted").then(function (ok) {
        if (ok) { delete insState.picked[x.id]; insState.view = "grid"; insState.id = null; refresh(); }
      });
    });
    var ta = $("#ins-transcript", root);
    $("#ins-paste", root).addEventListener("click", function () {
      function fallback() { ta.focus(); toast("Your browser asked for permission. Click in the box and press Cmd+V (or Ctrl+V)."); }
      if (!navigator.clipboard || !navigator.clipboard.readText) { fallback(); return; }
      navigator.clipboard.readText().then(function (text) {
        if (!text || !text.trim()) { toast("Your clipboard is empty. Copy the transcript first."); return; }
        if (ta.value.trim() && !window.confirm("Replace the transcript that's already here?")) return;
        ta.value = text.trim();
        markDirty(true);
        toast(hasTimestamps(text) ? "Pasted. It has timestamps: click \"Clean text\" to remove them." : "Transcript pasted. Remember to save.");
      }, fallback);
    });
    $("#ins-clean", root).addEventListener("click", function () {
      if (!ta.value.trim()) { toast("Paste a transcript first"); return; }
      if (!hasTimestamps(ta.value)) { toast("No timestamps found, it's already clean"); return; }
      ta.value = cleanTranscript(ta.value);
      markDirty(true);
      toast("Timestamps removed. Remember to save.");
    });
  }

  /* ---------------------------------------------------------------
     Start: check the session FIRST, then show the page
     --------------------------------------------------------------- */
  function goLogin() { location.replace("../login/"); }
  function start(session) {
    var email = (session.user && session.user.email) || "";
    $("#me-email").textContent = email;
    try { localStorage.setItem("tgs_skip_visits", "1"); } catch (e) { /* ignore */ }
    document.body.classList.remove("checking");
    $("#nav").addEventListener("click", function (e) { var b = e.target.closest("button[data-tab]"); if (b) go(b.dataset.tab); });
    $("#menu-btn").addEventListener("click", function () { if ($("#sidebar").classList.contains("open")) closeDrawer(); else openDrawer(); });
    $("#scrim").addEventListener("click", closeDrawer);
    $("#signout").addEventListener("click", function () { db.auth.signOut().then(goLogin, goLogin); });
    window.addEventListener("hashchange", function () { var t = location.hash.slice(1); if (t !== current && TABS[t]) go(t); });
    go(location.hash.slice(1) || "portfolio");
    if (email.toLowerCase() !== OWNER_EMAIL) {
      setTimeout(function () { notice("owner", "<strong>You're signed in as " + esc(email) + ".</strong>&nbsp;Your data is locked to " + OWNER_EMAIL + ", so nothing will show for this account.", "error"); }, 400);
    }
  }

  if (!db) {
    document.body.classList.remove("checking");
    document.querySelector(".app").innerHTML = '<div style="padding:40px;max-width:520px;margin:auto"><div class="notice error"><strong>We couldn\'t connect to your database.</strong>&nbsp;Check your internet connection and refresh the page.</div><a class="btn" href="../login/">Go to sign in</a></div>';
    return;
  }
  db.auth.getSession().then(function (res) {
    var session = res && res.data && res.data.session;
    if (!session) { goLogin(); return; }
    start(session);
  }, goLogin);
  db.auth.onAuthStateChange(function (event, session) {
    if (event === "SIGNED_OUT" || (event !== "INITIAL_SESSION" && !session)) goLogin();
  });
})();
