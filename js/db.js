/* =====================================================================
   THE GEMINI SOCIAL: DATABASE CONNECTION
   Your Supabase address and PUBLIC key live here, once, for every page.
   The public (publishable) key is safe to be on the website: the
   security rules in db.sql decide what it can do.
   NEVER put the secret (service role) key in this file or any file.
   Every page loads Supabase from a CDN first, then this file.
   ===================================================================== */
(function () {
  "use strict";
  var SUPABASE_URL = "https://gbnmvzpyvtgzqwzfusqc.supabase.co";
  var SUPABASE_KEY = "sb_publishable_OqXW5RWBR4D_naYBcNIoBw__ET5oCVA";

  // If Supabase couldn't load (no internet, CDN down), db stays null and
  // every page carries on without it.
  window.db = null;
  try {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  } catch (e) {
    window.db = null;
  }
})();
