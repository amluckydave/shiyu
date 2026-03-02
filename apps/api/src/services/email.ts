import nodemailer from "nodemailer"
import dns from "dns"

/** Generate a 6-digit verification code */
export function generateVerificationCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  console.log(`[Auth] Generated code: ${code}`)
  return code
}

/** Send a verification code email */
export async function sendVerificationEmail(toEmail: string, code: string): Promise<void> {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || "465", 10)
  const secure = process.env.SMTP_SECURE === "true" || port === 465
  const user = process.env.SMTP_USER || ""
  const pass = process.env.SMTP_PASS || ""

  if (!host || !user || !pass) {
    console.error(`[Auth] Cannot send email to ${toEmail}. SMTP_HOST, SMTP_USER or SMTP_PASS is not configured in .env`)
    throw new Error("Email configuration missing")
  }

  // Workaround for Clash TUN / VPN environments:
  // Node.js internally uses c-ares for DNS in net.connect, which can't resolve
  // through Clash TUN's fake DNS. We pre-resolve using the OS-level dns.lookup()
  // (which uses getaddrinfo and works correctly with Clash TUN), then connect
  // directly to the resolved IP with TLS servername for certificate validation.
  const { address } = await dns.promises.lookup(host, { family: 4 })
  console.log(`[Auth] Resolved ${host} -> ${address}`)

  const transport = nodemailer.createTransport({
    host: address,
    port,
    secure,
    auth: { user, pass },
    tls: { servername: host },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000
  })

  console.log(`[Auth] Sending verification code to ${toEmail}...`)

  await transport.sendMail({
    from: `"拾语" <${user}>`,
    to: toEmail,
    subject: `【拾语】验证码：${code}`,
    html: `
      <div style="max-width:480px;margin:0 auto;padding:32px;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="color:#0f172a;margin:0 0 8px;">拾语</h2>
          <p style="color:#64748b;margin:0;font-size:14px;">邮箱验证</p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;">
          <p style="color:#475569;font-size:14px;margin:0 0 16px;">您的验证码为：</p>
          <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0ea5e9;margin:0 0 16px;">${code}</div>
          <p style="color:#94a3b8;font-size:12px;margin:0;">验证码 5 分钟内有效，请勿泄露给他人</p>
        </div>
        <p style="color:#cbd5e1;font-size:11px;text-align:center;margin-top:24px;">如果这不是您的操作，请忽略此邮件。</p>
      </div>
    `
  })

  console.log(`[Auth] Email sent successfully to ${toEmail}`)
}
