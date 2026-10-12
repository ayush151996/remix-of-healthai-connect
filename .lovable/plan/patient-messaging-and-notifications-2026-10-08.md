# Patient messaging and notifications

## User experience
- Add a private Messages area for signed-in users with inbox, sent messages, unread state, and custom message composition.
- Let patients contact another account by registered email or by searching a limited patient directory; also provide a direct Admin recipient option.
- Let Admins message any patient and show that selected patient's phone number only inside the Admin compose flow.
- Add an unread indicator and make received messages visible in the recipient's account.
- Add email alerts for new messages once a verified sender domain is configured. Until then, in-app notifications remain available and the app clearly indicates email is pending setup.

## Privacy and access
- Store messages in Lovable Cloud and restrict reads to sender and recipient.
- Derive sender identity from the signed-in account; validate recipients and message length in a protected database function.
- Expose directory names only, protect account email lookup, and keep phone access behind a server-verified Admin role check.
- Prevent non-admins from sending as Admin or reading another user's conversations.

## Technical details
- Add the messaging schema and narrowly scoped security-definer helper functions through a migration with required table grants, RLS policies, and authenticated execute grants.
- Add a Messages page, route, signed-in navigation entry, inbox/unread presentation, and Admin-only recipient-phone lookup.
- Use Lovable's existing app-email flow once email-domain setup is complete; do not expose recipient addresses or trust client-supplied sender IDs.
- Verify two-account isolation, patient-to-Admin delivery, Admin phone visibility boundaries, unread/read behavior, and email status.
