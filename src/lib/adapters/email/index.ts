import { env } from "@/lib/env";

/**
 * Email adapter. Used for password reset, purchase receipts, etc.
 * - console (dev): logs the message; no network, no keys.
 * - resend  (prod): sends via the Resend HTTP API.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailAdapter {
  readonly name: string;
  send(msg: EmailMessage): Promise<void>;
}

class ConsoleEmailAdapter implements EmailAdapter {
  readonly name = "console";
  async send(msg: EmailMessage): Promise<void> {
    console.info(
      `\n[email:console] to=${msg.to} subject="${msg.subject}"\n${msg.text ?? msg.html}\n`,
    );
  }
}

class ResendEmailAdapter implements EmailAdapter {
  readonly name = "resend";
  async send(msg: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
    }
  }
}

let instance: EmailAdapter | undefined;

export function email(): EmailAdapter {
  if (!instance) {
    instance =
      env.EMAIL_DRIVER === "resend"
        ? new ResendEmailAdapter()
        : new ConsoleEmailAdapter();
  }
  return instance;
}
