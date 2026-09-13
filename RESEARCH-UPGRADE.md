# Research publishing upgrade

Status: implementation and automated integration verified; live deployment and browser acceptance are pending. Do not treat this document as production sign-off.

## Architecture and changes

Tiptap 3 provides the structured WYSIWYG editor and table/formatting commands. KaTeX renders equations with trust disabled. Admin editor code is dynamically imported. Existing Markdown articles retain their renderer; editing imports sanitized legacy HTML. Public rich articles use an allowlisted React renderer rather than arbitrary HTML.

Main files: components/rich-editor/*, components/rich-content.tsx, components/entry-preview.tsx, components/admin.tsx, app/research/[slug]/page.tsx, lib/content.ts, lib/rich-content.ts, lib/validation.ts, lib/server/data.ts, lib/server/asset-references.ts, lib/backup.ts, lib/drafts.ts, admin version API routes, supabase/schema.sql.

## Implemented code

- Paragraphs/headings, bold/italic/underline/strike/sub/superscript, alignment, lists, quotes, dividers, links, code, undo/redo, floating formatting toolbar.
- Editable financial tables, row/column controls and mobile scroll containers.
- Persisted image uploads through the existing protected upload API, paste/drop/file picker, replacement, captions, alt text, size/display controls; galleries with per-image captions/alt text; GIF bytes are not transcoded.
- Inline/block equations, footnotes with numbered public references/backlinks, callouts, automatic public TOC.
- Allowlisted external embeds and HTTPS audio playback. Metadata, tags, slug, SEO overrides, social preview, templates, expanded writing mode.
- Debounced autosave, visible failures, serialized requests, unsaved tab recovery, unload/navigation warnings, preview preserving the editor instance.
- Private working copies of published articles. Explicit republish updates the public snapshot. Atomic optimistic revision checks, meaningful version checkpoints and restoration.

## Database deployment requirement

Apply the complete `supabase/schema.sql` in the existing project's SQL Editor BEFORE deploying this branch. It is transactional and adds `published_data`, `published_updated_at`, version history and revised RPCs without deleting existing entries. Published legacy data is backfilled. Reapplication is tested to preserve a private working copy. No live migration has been executed by this task.

Keep all existing server environment variables and authentication settings. Do not expose service role credentials. After migration, deploy the branch to a preview environment, test with the owner account, then promote only after acceptance. Keep a database backup; rolling application code backward after new private edits needs review because old code reads the working data column.

## Actual verification

- TypeScript check passed.
- Real Tiptap commands in jsdom: formatting, tables, undo/redo, JSON reload, legacy image import, equation and footnote HTML round-trip.
- API route → real PostgreSQL-compatible PGlite RPC → reload → renderer → publish → private autosave → republish integration passed. Identity-provider HTTP transport is mocked, not a real Supabase login.
- Legacy migration preserves URL, content and metadata. Database tests cover stale saves, rollback, version restore, anonymous access denial and published snapshot isolation.
- Security/renderer/backup tests check unsafe URLs, scripts, media privacy and references.

## Remaining acceptance / limitations

Live Supabase migration, owner login, actual storage upload round-trip, complete browser workflow and real mobile/tablet visual acceptance are NOT verified. Public domain currently renders a generic load error; server logs are needed to establish its cause.

Direct audio/video upload and microphone recording are not implemented; existing 4 MB storage validation is retained. Use supported embeds or hosted HTTPS audio. Custom saved templates, full keyboard slash-menu navigation, general paragraph drag handles and advanced image alignment remain incomplete. Some insertion/edit dialogs use browser prompts. The editor TOC is a placeholder while writing; preview/public TOC is generated. Existing headings without explicit IDs use generated anchors. Image/GIF animation and external provider availability require browser acceptance.
