import nodemailer, { type Transporter } from "nodemailer";

export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

let cachedTransporter: Transporter | null = null;

const getBoolean = (value: string | undefined): boolean => {
  if (!value) return false;
  return value.toLowerCase() === "true";
};

function resolveTransporter(): Transporter | null {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const secureEnv = process.env.SMTP_SECURE;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host) {
    console.warn("SMTP_HOST is not configured; transactional emails disabled");
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: secureEnv ? getBoolean(secureEnv) : port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  return cachedTransporter;
}

export async function sendSystemEmail(payload: MailPayload): Promise<void> {
  const transporter = resolveTransporter();
  if (!transporter) {
    return;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) {
    console.warn("SMTP_FROM or SMTP_USER must be configured for email sending");
    return;
  }

  await transporter.sendMail({
    ...payload,
    from,
  });
}
