import nodemailer from "nodemailer";

/**
 * Service to handle transactional email sending.
 * Sends transactional email through SMTP configured in the server environment.
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.init();
  }

  init() {
    const host = process.env.SMTP_HOST?.trim();
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port: Number(port) || 587,
          secure: Number(port) === 465,
          auth: { user, pass }
        });
        this.isConfigured = true;
      } catch (err) {
        console.warn("[EmailService] Failed to initialize SMTP transporter:", err.message);
        this.isConfigured = false;
      }
    } else if (host || user || pass) {
      console.warn("[EmailService] SMTP is only partially configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM.");
    }
  }

  /**
   * Send password reset email
   * @param {Object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.resetUrl - Full reset password URL with token
   * @param {string} options.name - User name
   */
  async sendPasswordReset({ to, resetUrl, name }) {
    const from = process.env.EMAIL_FROM || "no-reply@devra.ai";
    const subject = "Devra — Password Reset Request";
    const text = `Hello ${name || "Devra User"},\n\nYou requested a password reset for your Devra account.\nPlease use the following link to reset your password within 15 minutes:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\n— The Devra Security Team`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Reset Your Devra Password</h2>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">Hello <strong>${name || "Devra User"}</strong>,</p>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">We received a request to reset your password. Click the button below to choose a new password. This link is valid for <strong>15 minutes</strong>.</p>
        <div style="margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #8B7CFF; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.4;">Or copy and paste this link into your browser:<br/><span style="color: #3b82f6; word-break: break-all;">${resetUrl}</span></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">If you did not make this request, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>
    `;

    if (this.isConfigured && this.transporter) {
      return await this.transporter.sendMail({
        from,
        to,
        subject,
        text,
        html
      });
    } else {
      // Safe development/staging fallback: Log structured operational event WITHOUT raw token or reset URL
      const redactedRecipient = typeof to === "string" && to.includes("@")
        ? `${to[0]}***@${to.split("@")[1]}`
        : "user@domain";
      console.log("[EmailService] Password reset email dispatched (SMTP not configured, delivery simulated).");
      console.log(`[EmailService] Recipient: ${redactedRecipient} | Token: [REDACTED_SECURITY_TOKEN]`);
      return { messageId: "dev-simulated-msg-" + Date.now(), simulated: true };
    }
  }
}


export const emailService = new EmailService();
