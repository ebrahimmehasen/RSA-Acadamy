/**
 * One-time OAuth setup: obtains a Google refresh token for Drive
 * uploads using the school's own Google account.
 *
 * Prereq: an OAuth "Desktop app" client in Google Cloud Console with
 * GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in .env.local.
 *
 * Usage: npx tsx scripts/get-google-token.ts
 * Opens an auth URL — sign in with the Drive-owning account, approve,
 * and the refresh token is appended to .env.local automatically.
 */
import { createServer } from "node:http";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { google } from "googleapis";
import { config } from "dotenv";

config({ path: ".env.local" });

const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;

async function main() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error(
      "أضف GOOGLE_OAUTH_CLIENT_ID و GOOGLE_OAUTH_CLIENT_SECRET في .env.local أولًا",
    );
    process.exit(1);
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT);
  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive"],
  });

  console.log("\nافتح الرابط ده في المتصفح وسجّل دخول بحساب Google بتاع المدرسة:\n");
  console.log(authUrl);
  console.log("\nمستني الموافقة...");

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", REDIRECT);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const authCode = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (authCode) {
        res.end("<h2>تمت الموافقة ✅ — ارجع للتيرمنال</h2>");
        server.close();
        resolve(authCode);
      } else {
        res.end(`<h2>فشل: ${error}</h2>`);
        server.close();
        reject(new Error(error ?? "no code"));
      }
    });
    server.listen(PORT);
  });

  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "مفيش refresh_token في الرد — جرب تشيل صلاحية التطبيق من myaccount.google.com/permissions وأعد المحاولة",
    );
  }

  const envPath = ".env.local";
  const envContent = readFileSync(envPath, "utf8");
  if (envContent.includes("GOOGLE_OAUTH_REFRESH_TOKEN=")) {
    writeFileSync(
      envPath,
      envContent.replace(
        /GOOGLE_OAUTH_REFRESH_TOKEN=.*/,
        `GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`,
      ),
    );
  } else {
    appendFileSync(
      envPath,
      `\nGOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}\n`,
    );
  }

  console.log("\nتم حفظ الـ refresh token في .env.local ✅");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
