/* =====================================================================
   THE GEMINI SOCIAL: SIGN UPS (shared by every page with a sign up form)
   Saves a lead to your Leads list (Supabase) and sends the sign up to
   MailerLite. The two are separate: if one fails or is slow, the other
   still happens. Neither ever shows the visitor an error.
   Load this AFTER js/db.js.
   ===================================================================== */

/* ---- YOUR MAILERLITE FORMS ----
   Where each sign up form sends to. These are PUBLIC form details
   (not secret keys), copied from your MailerLite forms. If you make a
   new form in MailerLite, replace the matching "subscribe" address. */
window.MAILERLITE_FORMS = {
  // Social Media Audit pop up on the home page
  audit: "https://assets.mailerlite.com/jsonp/2688568/forms/200561110842082617/subscribe",
  // "Get your free copy" form on the Content Pillar Builder page
  contentPillars: "https://assets.mailerlite.com/jsonp/2688568/forms/200572583186270203/subscribe"
};
window.MAILERLITE_EXTRA = { "ml-submit": "1", "anticsrf": "true" };

(function () {
  "use strict";

  /* Saves a new lead to your Leads list (contacts table).
     Resolves to true or false, never throws. */
  function saveLead(lead) {
    try {
      if (!window.db) return Promise.resolve(false);
      return window.db.from("contacts").insert(lead).then((res) => !res.error, () => false);
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  /* Sends a sign up to MailerLite in the background. MailerLite allows
     this from any site, so we can read its reply; if the browser still
     blocks it, we send it again "blind" (no reply needed). Never throws. */
  function sendToMailerLite(url, name, email) {
    const body = () => {
      const data = new URLSearchParams();
      data.append("fields[name]", name);
      data.append("fields[email]", email);
      Object.keys(window.MAILERLITE_EXTRA).forEach((k) => data.append(k, window.MAILERLITE_EXTRA[k]));
      return data;
    };
    try {
      return fetch(url, { method: "POST", body: body(), keepalive: true })
        .then((r) => r.json())
        .then((res) => !!(res && res.success), () => {
          return fetch(url, { method: "POST", mode: "no-cors", body: body(), keepalive: true }).then(() => true, () => false);
        });
    } catch (err) {
      try { return Promise.resolve(navigator.sendBeacon(url, body())); } catch (e2) { return Promise.resolve(false); }
    }
  }

  const clip = (v, max) => (v || "").trim().slice(0, max) || null;
  const looksLikeEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || "");

  window.tgsLeads = { saveLead, sendToMailerLite, clip, looksLikeEmail };
})();
