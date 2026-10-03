/* =====================================================================
   THE GEMINI SOCIAL: SIMPLE VISIT LOG
   Saves one row per page visit: the date, the page and where the
   visitor came from (Instagram, Google, Direct...). Nothing that
   identifies a person is stored: no IP address, no cookies, no device.
   - The same page is counted once per browser tab session.
   - Your own visits are not counted once you have opened the admin.
   ===================================================================== */
(function () {
  "use strict";
  try {
    if (!window.db) return;
    if (localStorage.getItem("tgs_skip_visits") === "1") return; // that's you
    if (navigator.webdriver) return; // automated browsers

    var page = location.pathname.replace(/index\.html$/, "") || "/";
    var seenKey = "tgs_seen_" + page;
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, "1");

    // Where did they come from?
    var params = new URLSearchParams(location.search);
    var source = params.get("utm_source") || "";
    if (!source) {
      var host = "";
      try { host = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ""; } catch (e) { host = ""; }
      if (!host) source = "Direct";
      else if (host === location.hostname) source = "Internal";
      else if (host.indexOf("instagram") > -1) source = "Instagram";
      else if (host.indexOf("facebook") > -1 || host === "fb.me") source = "Facebook";
      else if (host.indexOf("linkedin") > -1 || host === "lnkd.in") source = "LinkedIn";
      else if (host.indexOf("google") > -1) source = "Google";
      else if (host.indexOf("bing") > -1) source = "Bing";
      else if (host.indexOf("pinterest") > -1) source = "Pinterest";
      else if (host.indexOf("canva") > -1) source = "Canva";
      else source = host.replace(/^www\./, "");
    }
    source = source.charAt(0).toUpperCase() + source.slice(1);

    window.db.from("visits").insert({ page: page.slice(0, 200), source: source.slice(0, 100) })
      .then(function () {}, function () {});
  } catch (e) { /* never break the page for a visit count */ }
})();
