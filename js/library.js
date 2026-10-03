/* =====================================================================
   THE GEMINI SOCIAL: CHECKLIST TEMPLATES
   These are the two checklists in the Checklists tab of your admin.
   You can edit the wording, add or remove items, and add sections.
   Keep the same shape: a section has a "title" and a list of "items",
   each item written between quotes and followed by a comma.

   Note: ticks are saved against the exact wording of each item.
   If you change the wording of an item, that item starts unticked again.
   ===================================================================== */
window.Library = {

  /* ---- CLIENT ONBOARDING (done once per client) ---- */
  ONBOARDING: [
    {
      title: "Paperwork",
      items: [
        "proposal accepted",
        "agreement signed",
        "client set up in Hnry",
        "first invoice scheduled"
      ]
    },
    {
      title: "Access",
      items: [
        "Instagram access received",
        "Facebook and Meta Business access received",
        "other logins stored safely",
        "shared folder created"
      ]
    },
    {
      title: "Brand",
      items: [
        "logo and brand colours received",
        "fonts received",
        "tone of voice notes taken",
        "existing photos and videos collected"
      ]
    },
    {
      title: "Strategy",
      items: [
        "discovery call done",
        "goals and target audience agreed",
        "account audit done",
        "content pillars agreed"
      ]
    },
    {
      title: "Kick off",
      items: [
        "first shoot booked",
        "first content plan sent",
        "first content plan approved",
        "reporting day agreed"
      ]
    }
  ],

  /* ---- MONTHLY WORKFLOW (fresh every month, per client) ---- */
  MONTHLY: [
    {
      title: "Plan",
      items: [
        "review last month's results",
        "content plan drafted",
        "content plan approved by client"
      ]
    },
    {
      title: "Create",
      items: [
        "shoot booked or content collected",
        "reels edited",
        "carousels and graphics designed",
        "captions written"
      ]
    },
    {
      title: "Approve and schedule",
      items: [
        "content sent for approval",
        "changes made",
        "everything scheduled"
      ]
    },
    {
      title: "Engage",
      items: [
        "comments and messages checked through the month",
        "stories posted"
      ]
    },
    {
      title: "Report",
      items: [
        "numbers logged in the Results tab",
        "Canva report created",
        "report sent to client",
        "check in call done"
      ]
    }
  ]
};
