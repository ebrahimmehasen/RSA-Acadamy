# RSA Academy — working rules

Next.js 16 (App Router) + Supabase + Google Drive storage, deployed on Vercel
(Hobby). Run `npx tsc --noEmit`, `npm run lint` and `npm run build` before
every commit.

## Files — they never pass through Vercel

Vercel Hobby caps "Fast Origin Transfer"; streaming file bytes through
functions paused the project once. So, for **every** feature, old or new:

**Uploads: browser → Google Drive directly.**
- Simple "attach a file" features: register a kind in
  `lib/uploads/fileKinds.ts` (size/type rule in `UPLOAD_RULES`,
  `lib/googleDrive/upload.ts`, folder, allowed roles). In the form, use
  `useTicketedSubmit(formAction, [{ name, kind, ticketName }])`
  (`lib/uploads/useTicketedSubmit.ts`). It uploads each file to Drive
  through `/api/uploads/file` and sends the action a **ticket** instead of
  the file. In the server action, call
  `redeemFileTicket(ticket, { kind, uploaderId, entityId })`
  (`lib/uploads/ticket.ts`) and store the returned `driveFileId`.
- Uploads that need their own bookkeeping (assignment answers and
  attachments, recorded sessions) have dedicated routes under
  `app/api/uploads/` that use the same protocol and client
  (`lib/submissionUploader.ts`). Copy one of those routes.
- The server still validates everything when the upload starts (role, size,
  type, quotas) and confirms the finished file with Drive itself
  (`relayStatus`). The ~4MiB relay through Vercel (`lib/chunkRelay.ts`) is
  only a fallback for browsers that can't reach Google.

**Downloads and previews: through the Cloudflare Worker.**
- Build every file URL with `fileUrl(driveFileId)` from
  `lib/signedFileUrl.ts`, in a server component, and pass the URL to client
  components. For downloads, use `withDownload(url)` (`lib/fileLinks.ts`).
- Worker source: `workers/files-proxy/index.js`
  (`https://rsa-files.mohmmedhosni34.workers.dev`). It uses signed links
  that expire in 24–48h and supports Range requests (video seeking).

**Never:**
- read a `File` or call `.arrayBuffer()` in a server action or route
- import `@/lib/googleDrive/client` outside `lib/googleDrive/`
- hard-code `/api/files/...` links (that proxy only exists as a fallback
  for when the Worker env vars are missing)
- raise `serverActions.bodySizeLimit` (it's `1mb` on purpose)

ESLint enforces the first three (`eslint.config.mjs`). Required env:
`FILES_WORKER_URL`, `FILES_SIGNING_SECRET` (same value in the Worker),
`UPLOAD_ALLOWED_ORIGINS` (site origins allowed to upload directly to Drive).

## Git

- Commit locally after every change. Push only when asked.
- Deploys run from GitHub Actions (`.github/workflows/vercel-deploy.yml`) on
  pushes to `main` (production) and `development` (preview).
