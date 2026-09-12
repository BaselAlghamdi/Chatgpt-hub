# Website audit and fixes

## Follow-up implementation, 10 September 2026

- Private media publication now derives from rendered Markdown destinations. Existing associations are rechecked against current published content before serving files.
- Public/admin lists request card fields instead of full Markdown. Full content is retrieved for detail/editor and paginated backup only; reading time is persisted on save.
- Backup downloads include uploaded bytes and SHA-256 checksums, with bounded authenticated pages and a 64 MB browser limit. Import validates first and creates draft copies. Profile restore is separate and revision-protected. Backups are not a database snapshot during concurrent edits; external files remain URLs.
- Password recovery is available in the login form with generic responses and a trusted configured redirect. Supabase must allow the exact SITE_URL plus `/desk-65efdcc4b137b000/reset-password`; actual email delivery was not tested.
- Unsaved edits can be recovered in the same browser tab. Recovery requires explicit action and retains the old revision to prevent silent overwrites. Copies clear on save/delete/logout; this is not permanent storage.
- Profile saves refresh the layout; missing search results are explained; validation errors identify their field paths.
- Honor cards without images use full width; heading entities and Arabic fragment links are handled; card links have contextual accessible names.
- Follow-up automated suite: 50 tests passed. Live administrator writes, password sends and restore were not exercised against production.


Date: 9 September 2026. Base commit: `8a65e9b58a53cb4378bc73c6b9283f1226d4f328`.

Scope: application source, server routes, Markdown, database migration, dependency audit, production compilation, local HTTP responses, and public browser navigation. The approved forest-green editorial design is retained. No live database records, credentials, or Supabase settings were changed.

## Priority list

| Priority | Finding | Resolution |
|---|---|---|
| P1 | Recovery access and refresh tokens stayed in the address bar | Scrub fragment after hydration, retain only access token in React memory, clear after password update |
| P1 | Backend failures became cached empty research lists | Cached function now throws; genuine empty lists remain valid; framework error handling applies when no cached result is available |
| P1 | Previously shared secret key and recovery links | Owner action: replace any still-active exposed secret, update Vercel, redeploy, then revoke the old key; rotation cannot be verified here |
| P2 | Long Arabic articles could exceed the JSON byte limit despite passing character validation | Bounded JSON limit raised to 1 MiB; upload limits unchanged |
| P2 | Markdown parsed on every editor render | Preview dynamically loaded and parsed only while mounted, with body-based memoization |
| P2 | Login/reset imported the editor for a field component; public helpers imported runtime validation | Extracted accessible Field; moved Zod schemas to a separate validation module |
| P2 | Profile edits lost when switching tabs; internal links bypassed unload prompts | Profile remains mounted across tabs; dirty forms guard ordinary link clicks and document unload |
| P2 | Invalid Markdown figure-in-paragraph markup and repeated H1 | Images use phrasing elements; content headings start at H2 |
| P2 | Missing canonical and social metadata | Added per-page canonical, description, Open Graph and Twitter metadata |
| P2 | Tablet grid override and cramped navigation | Fixed tablet About grid, long-text wrapping, scrollable menu, stable menu button and larger close target |
| P3 | Tags normalized on each keystroke | Preserve comma whitespace during typing; normalize on save |
| P3 | Reading progress recalculated for each scroll event | Schedule at most one update per animation frame |

## 1. Code quality and bugs

TypeScript and the production build pass. No syntax or unclosed JSX errors were found. Much of the inherited source is compressed into long lines; formatting it across the whole repository remains a maintenance improvement, not a runtime bug.

The previous JSON reader limited bytes to 220,000 while the article schema accepted 160,000 characters. Arabic characters commonly require more than one UTF-8 byte. The revised reader remains bounded:

```ts
export async function requestJson(request: Request) {
  return JSON.parse(new TextDecoder().decode(
    await boundedBody(request, 1024 * 1024)
  ));
}
```

Profile tabs now preserve their form state:

```tsx
<TabsContent value="profile" forceMount className="data-[state=inactive]:hidden">
  <ProfileEditor initial={profile}/>
</TabsContent>
```

Dirty forms intercept ordinary anchor navigation and use `beforeunload`. This is not a complete browser-history navigation blocker: a browser Back action handled entirely by the Next router can still bypass these guards. Draft autosave would need separate persistence/conflict handling before being introduced safely.

## 2. Responsiveness and design

A late desktop `.about-strip` declaration overrode the tablet rule even though its second column was hidden. The fix restores a single column at the tablet breakpoint. The menu can scroll in short viewports; its close control is 44 by 44 CSS pixels. Long headings, breadcrumbs and contact addresses can wrap.

```css
@media (max-width: 1100px) {
  .about-strip { grid-template-columns: 1fr; }
}
.navigation-sheet { overflow-y: auto; overscroll-behavior: contain; }
.menu-button { flex-shrink: 0; }
h1, .lead, .breadcrumb { overflow-wrap: anywhere; }
```

The production desktop About page was visually inspected; homepage navigation, menu opening, Escape dismissal and About navigation were exercised. Mobile and tablet rules were reviewed in source, but a real-device or resized-browser matrix was not completed. The cloud browser could not connect to the local production server. Do not interpret this audit as mobile-device certification.

## 3. Performance and speed

Previously `renderMarkdown(data.body)` ran inside the parent editor on every state update. A dynamically imported preview now owns parsing, so typing in Write does not parse the full article. Memoization avoids parsing again for title-only changes while preview is mounted.

```tsx
const EntryPreview = dynamic(() => import('./entry-preview'));
// Inside the preview component:
const preview = useMemo(() => renderMarkdown(body), [body]);
```

`lib/content.ts` now uses type-only schema imports. Runtime Zod validation lives in `lib/validation.ts`, used by server writes, rather than the public helper import graph. Login/reset fields no longer create an import cycle through the editor. This is a verified dependency-graph change; no percentage improvement in download size or real-user loading time is claimed.

The public cache no longer stores a failed request as successful empty content. Cache keys include the Supabase URL to distinguish projects. Existing 60-second caching and publish invalidation remain; live authorization and private-media checks are not cached.

```ts
// Avoid catching inside a cache and returning [] on service failure.
const cachedPublishedEntries = unstable_cache(async (kind) => {
  const rows = await rest(/* filtered published entries query */);
  return rows.map(decode);
}, ['portfolio-published-entries-v2', process.env.SUPABASE_URL || 'unconfigured'],
   {revalidate: 60, tags: ['portfolio-content']});
```

Remaining: responsive image variants and intrinsic dimensions for uploaded covers, field Core Web Vitals, and regional latency measurement. No heavy live image library was available in the currently empty portfolio to benchmark. A region migration was not performed. Private images must not enter a publicly reusable image cache without an explicit access/revocation design.

## 4. Accessibility

Field labels now explicitly reference input IDs, and hints use `aria-describedby`. Small section numbers use the existing darker muted text color. The menu close target is larger. Published covers already require nonempty descriptive alt text through validation.

```tsx
<label htmlFor={id}>{label}</label>
{cloneElement(children, {id, 'aria-describedby': hint ? id + '-hint' : undefined})}
{hint && <small id={id + '-hint'}>{hint}</small>}
```

The Markdown renderer previously emitted `<figure>` inside paragraphs. It now emits a block-styled `<span>` with an image and optional caption span, which is valid phrasing content. Raw HTML remains escaped. Markdown H1 headings render as H2 so the page title remains the single H1; generated headings still populate the article contents navigation.

Remaining: screen-reader testing, full WCAG contrast/focus audit, and checking author-provided image descriptions for quality. An empty inline Markdown alt can be appropriate for a decorative image, so it is not rejected globally. No claim of full WCAG compliance is made.

## 5. Security

Recovery credentials previously persisted in the URL until successful submission. The root provider now captures the recovery access token in memory, discards the refresh token, and removes the fragment while preserving Next history state:

```ts
if (recovery) setToken(hash.get('access_token') || '');
history.replaceState(history.state, '', location.pathname + location.search);
if (recovery && path !== resetPath) router.replace(resetPath);
```

The reset page reads that context, displays a missing-link message when appropriate, and clears the token on success. Reloading after scrubbing intentionally loses the memory-only token; the user must reopen/request a recovery link. Scrubbing occurs after client hydration, not before every browser extension could observe the URL. The complete emailed recovery flow was not exercised with a live account.

Added a compatibility-preserving CSP:

```text
base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'
```

This restricts embedding, base URL changes, plugins and form destinations. It is not a full script allowlist or a substitute for escaping/authentication.

Existing protections passed isolated tests: confirmed owner email AND UUID checks; rejected forged sessions/non-owner logins; HttpOnly/SameSite cookies; same-origin write checks; draft/media access checks; size/signature validation; safe Markdown URLs; transactional revision conflicts; and database-role restrictions. Supabase Auth and HTTP calls are mocked; SQL tests execute the actual migration in local PGlite. Production RLS, Auth settings, rate limits, and secret rotation were not independently verified.

Dependency audit reported zero known vulnerabilities at review time. This does not establish absence of application vulnerabilities. No brute-force attempts, destructive probes or real credential submissions were performed.

## 6. SEO

Added one helper for canonical URLs, descriptions and share metadata; each public route supplies its own path. Article/project metadata comes from the published entry. Missing detail pages remain not-found responses and receive noindex metadata. Administrator pages remain noindex.

```ts
export const metadata = pageMetadata(
  '/projects', 'Projects',
  'Explore financial models, reports, presentations, and other projects by Basel Alghamdi.'
);
```

The canonical origin uses `SITE_URL`, falling back to the approved custom domain. Verify this variable whenever moving domains. No generated demo social image or invented structured research data was added.

References for implementation: [Next metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata), [Next data cache](https://nextjs.org/docs/app/api-reference/functions/unstable_cache).

## Verification record and limits

- `npm test`: 27 tests passed after the final code changes.
- `npm run typecheck`: passed.
- `npm run build`: passed with Next.js 16.3.4.
- Local production HTTP checks: home, About, Research, Projects and reset page returned 200; each had one H1 and a main landmark. Public pages had canonical tags; security headers were present.
- Browser: custom-domain home/About and navigation inspected. Extension-generated console errors were observed and are not evidence of an application error.
- New regression tests cover a 160,000-character Arabic body, oversize rejection, service failure versus genuine empty lists, valid image markup/H1 normalization, and canonical metadata.
- Cache tests stub Next cache; they verify application behavior, not Vercel cache persistence or regional latency.
- No live administrator mutation, uploaded-content performance benchmark, mobile device matrix, or exhaustive penetration test was completed. The legacy Vercel alias returned deployment-not-found during initial inspection; the custom domain worked.
