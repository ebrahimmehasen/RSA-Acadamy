import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const client = apiKey ? new Resend(apiKey) : null;
const FROM = process.env.NEXT_PUBLIC_SENDER_EMAIL ?? "noreply@rsa-academy.com";

/**
 * No-ops (logs and returns) until RESEND_API_KEY is set — every
 * caller in the app treats email as best-effort, never blocking the
 * underlying action (payment approval, grading, etc. still succeed
 * with no email configured).
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean }> {
  if (!client) {
    console.log(`[email disabled] would send "${options.subject}" to ${options.to}`);
    return { sent: false };
  }

  try {
    await client.emails.send({
      from: FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return { sent: true };
  } catch (error) {
    console.error("Resend send failed:", error);
    return { sent: false };
  }
}
