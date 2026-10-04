import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Files must never pass through Vercel (CLAUDE.md, "Files"): uploads go
  // browser → Drive (lib/uploads), downloads go through the Cloudflare
  // Worker (lib/signedFileUrl.ts fileUrl()).
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ignores: ["lib/googleDrive/**", "lib/signedFileUrl.ts", "lib/chunkRelay.ts", "app/api/files/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/googleDrive/client",
              message:
                "Don't move file bytes through Vercel. Upload via lib/uploads (uploadFile / useTicketedSubmit) and serve via fileUrl().",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='arrayBuffer']",
          message:
            "Don't read file bytes on the server. Upload straight to Drive with lib/uploads (useTicketedSubmit) and redeem the ticket in the action.",
        },
        {
          selector: "TemplateElement[value.raw=/api.files./], Literal[value=/api.files./]",
          message:
            "Don't link to the /api/files proxy (it streams through Vercel). Use fileUrl() from lib/signedFileUrl.ts.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
