/**
 * One-time (idempotent) setup: creates the canonical folder tree in
 * Google Drive and caches folder IDs in the drive_folders table.
 *
 * Usage: npx tsx scripts/init-drive-folders.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  // dynamic import so env vars are loaded before lib/googleDrive reads them
  const { initializeFolderStructure } = await import(
    "../lib/googleDrive/folders"
  );
  const result = await initializeFolderStructure();
  for (const [path, id] of Object.entries(result)) {
    console.log(`${path}  →  ${id}`);
  }
  console.log("\nDrive folder structure ready ✅");
}

main().catch((error) => {
  console.error(error?.response?.data ?? error);
  process.exit(1);
});
