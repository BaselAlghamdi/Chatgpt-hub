# Verification record

Date: 2026-09-08

## Passed

- Next.js 16.3.4 production build and TypeScript checking.
- Dependency audit after patching: 0 reported vulnerabilities across the installed dependency tree (`npm audit fix`, without force).
- 21 automated tests: content validation, unsafe Markdown/link handling, file signature and size checks, owner identity, session cookies, CSRF, unauthorized API requests, private draft media, optimistic edit conflicts, and logout.
- The complete SQL migration executed against local PostgreSQL through PGlite. Verified empty content, atomic writes, conflict handling, rollback for missing attachments, publishing/unpublishing, cascading associations, profile revisions, browser-role permission denial, and private storage configuration.
- Browser review: home and About rendered with the preserved palette and editorial layout. Contact links, removed slogan/logo, academic honors placement, and empty public content were checked.
- Browser interactions: hamburger navigation opened successfully; the editor switched between Write and Preview; headings generated the “In this article” navigation and a readable table; visibility switched from Draft to Published.
- A temporary local-only fixture was used to inspect the editor. It was removed before the final build and is not part of the exported application.

## Limits and deployment checks

- Supabase API/auth tests used mocked service responses. SQL tests used a real local PostgreSQL engine, not the owner's live Supabase project.
- No owner credentials were provided or committed. Actual owner sign-in, live storage upload, and publication on the owner's Supabase account require the environment setup in README.md and a final live smoke test.
- Desktop screenshot inspection succeeded. Full-page capture and mobile iframe inspection were unreliable in the review browser; a complete mobile browser sign-off is not claimed. Responsive breakpoints are implemented for public pages and the editor.
- This is a functional and security-focused review, not a guarantee that no vulnerability exists. No attack was made against the existing public website.
- GitHub contains the entire source, database schema, lockfile, and setup instructions. Vercel deployment, DNS changes, and the owner's cloud database setup are separate account actions and were not performed by the local tests.

## First live smoke test after setup

1. Open /desk-65efdcc4b137b000 and sign in as the configured owner.
2. Save a draft article with a heading and uploaded image. Open its guessed public URL in a signed-out browser: it must return 404.
3. Publish it; confirm the image, contents links, copying, printing, and HTML download.
4. Return it to Draft; confirm the public page and unshared media become unavailable.
5. Add a project and attachment, a professional certificate, and an academic honor. Confirm each placement in the public pages.
6. Edit About/contact, sign out, and confirm editing is denied.
7. Check the published site at 390px and desktop widths before making the custom domain primary.
