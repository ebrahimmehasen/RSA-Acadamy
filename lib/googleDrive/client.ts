import path from "node:path";
import { google } from "googleapis";

/**
 * Drive auth — two modes:
 *
 * 1. OAuth (preferred): uploads run as the school's own Google account
 *    (personal Gmail quota, 15GB). Needs GOOGLE_OAUTH_CLIENT_ID,
 *    GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN — see
 *    scripts/get-google-token.ts.
 *
 * 2. Service account (fallback): can read/list/create folders but
 *    CANNOT upload files to personal Drives (Google removed service
 *    account storage quota).
 */
function buildAuth() {
  const {
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REFRESH_TOKEN,
  } = process.env;

  if (
    GOOGLE_OAUTH_CLIENT_ID &&
    GOOGLE_OAUTH_CLIENT_SECRET &&
    GOOGLE_OAUTH_REFRESH_TOKEN
  ) {
    const oauth2 = new google.auth.OAuth2(
      GOOGLE_OAUTH_CLIENT_ID,
      GOOGLE_OAUTH_CLIENT_SECRET,
    );
    oauth2.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN });
    return oauth2;
  }

  return new google.auth.GoogleAuth({
    keyFile: path.join(
      /* turbopackIgnore: true */ process.cwd(),
      process.env.GOOGLE_DRIVE_KEY_FILE_PATH ?? "google-drive-key.json",
    ),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

export const drive = google.drive({ version: "v3", auth: buildAuth() });

export const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
