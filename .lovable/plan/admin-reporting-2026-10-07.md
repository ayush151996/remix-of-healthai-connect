# Admin Reporting

Add an Admin Reports view with selectable report types and date windows. Provide account and patient-profile aggregates from Lovable Cloud, a full-project summary using only verified data, and CSV export. Clearly identify appointment and report activity as unavailable because those records are not currently saved.

## Technical details
- Add an admin-only, security-definer database function for aggregate account/profile metrics; enforce the current authenticated admin role in the function.
- Add admin-scoped profile read access only if needed for report data; prefer aggregate data from the function to avoid exposing individual health details.
- Add report type and date-range controls to Admin, an on-screen summary, CSV download, and an honest note for activity not persisted by the app.
- Record the reporting access pattern in `AGENTS.md` and track the work in `roadmap.md`.
