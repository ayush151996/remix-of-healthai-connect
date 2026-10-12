# Project implementation rules

- Keep privileged admin access in the separate `user_roles` table and verify it through an authenticated database function, because client-side role flags are not trustworthy.
- Keep user profile details separate from role assignments, because profile data must not grant or imply authorization.
- Store patient health profiles in the RLS-protected `profiles` row keyed to the authenticated account; do not treat browser storage as the source of truth, because medical data must be private and persist across devices.
- Keep environment-specific public database settings in ignored local mode files, because development and production must be able to target separate projects without committing credentials.
- Serve admin reporting aggregates through a security-definer database function that verifies the authenticated admin role, because admin reports must not expose private account or health-profile rows to clients.
- Send and read private messages through narrowly scoped authenticated database functions that derive the sender from `auth.uid()`, because client-provided identities cannot establish message ownership.