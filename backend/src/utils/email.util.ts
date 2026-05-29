import nodemailer from "nodemailer";

interface PasswordResetEmailInput {
  toEmail: string;
  toName?: string | null;
  resetToken: string; // 6-digit code, not token
}

interface EmailVerificationInput {
  toEmail: string;
  toName?: string | null;
  verificationToken: string;
}

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const resolveActionUrl = (token: string, templateEnvName: "RESET_PASSWORD_URL" | "VERIFY_EMAIL_URL", fallbackPath: string): string => {
  const template = process.env[templateEnvName];
  if (template && template.includes("{token}")) {
    return template.replace("{token}", encodeURIComponent(token));
  }

  const frontendOrigin =
    process.env.FRONTEND_URL ??
    process.env.CORS_ORIGIN?.split(",").map((value) => value.trim()).filter(Boolean)[0] ??
    "http://localhost:8080";

  const basePath = template ?? `${frontendOrigin}/${fallbackPath}`;
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}token=${encodeURIComponent(token)}`;
};

const resolveResetUrl = (token: string): string => {
  return resolveActionUrl(token, "RESET_PASSWORD_URL", "reset-password");
};

const resolveVerifyEmailUrl = (token: string): string => {
  return resolveActionUrl(token, "VERIFY_EMAIL_URL", "verify-email");
};

export const sendPasswordResetEmail = async ({
  toEmail,
  toName,
  resetToken,
}: PasswordResetEmailInput): Promise<void> => {
  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");
  const from = process.env.SMTP_FROM?.trim() || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  const recipientName = toName?.trim() || "there";

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: "Reset your password - WAYNEXX",
    text: [
      `Hi ${recipientName},`,
      "",
      "We received a request to reset your password.",
      `Your reset code is: ${resetToken}`,
      "",
      "This code will expire in 15 minutes.",
      "",
      "If you did not request this, please ignore this email and your account will remain secure.",
    ].join("\n"),
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
          <table style="max-width: 600px; width: 100%; margin: 0 auto; border-collapse: collapse;">
            <!-- Header -->
            <tr style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 40px 20px;">
              <td style="padding: 40px 20px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; letter-spacing: 1px;">✈️ VOYAGEUR</div>
                <div style="font-size: 12px; opacity: 0.8; margin-top: 5px; letter-spacing: 2px;">CURATED TRAVEL EXPERIENCES</div>
              </td>
            </tr>

            <!-- Main Content -->
            <tr>
              <td style="padding: 40px 20px;">
                <div style="margin-bottom: 30px;">
                  <h2 style="color: #1a1a2e; font-size: 24px; margin: 0 0 15px 0;">Reset Your Password</h2>
                  <p style="color: #666; margin: 0 0 20px 0;">Hi ${recipientName},</p>
                  <p style="color: #666; margin: 0 0 25px 0;">We received a request to reset your password. Use the code below to proceed with your password reset.</p>
                </div>

                <!-- Code Display -->
                <div style="background: linear-gradient(135deg, #f0f4ff 0%, #f5f0ff 100%); border-left: 4px solid #6366f1; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
                  <div style="font-size: 12px; color: #666; margin-bottom: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Reset Code</div>
                  <div style="font-size: 48px; font-weight: bold; color: #1a1a2e; font-family: 'Monaco', 'Courier New', monospace; letter-spacing: 12px; word-spacing: 5px;">
                    ${resetToken}
                  </div>
                  <div style="font-size: 12px; color: #999; margin-top: 15px;">⏱️ Valid for 15 minutes</div>
                </div>

                <!-- Instructions -->
                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 30px 0;">
                  <h3 style="color: #1a1a2e; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">Next Steps:</h3>
                  <ol style="color: #666; margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Go to the password reset page</li>
                    <li style="margin-bottom: 8px;">Enter your email address</li>
                    <li style="margin-bottom: 8px;">Enter the code above</li>
                    <li style="margin-bottom: 0;">Create a new password</li>
                  </ol>
                </div>

                <!-- Security Notice -->
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 25px 0;">
                  <div style="color: #856404; font-size: 13px; font-weight: 500;">
                    🔒 Security Tip: Never share this code with anyone. WAYNEXX support will never ask for this code.
                  </div>
                </div>

                <!-- Footer Info -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 13px; margin: 0 0 8px 0;">
                    If you did not request a password reset, please ignore this email. Your account will remain secure.
                  </p>
                  <p style="color: #999; font-size: 13px; margin: 0;">
                    If you have any questions, contact our support team.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr style="background: #f5f5f5; border-top: 1px solid #ddd;">
              <td style="padding: 20px; text-align: center; font-size: 12px; color: #999;">
                <p style="margin: 0 0 5px 0;">© 2026 WAYNEXX. All rights reserved.</p>
                <p style="margin: 0;">Curated travel experiences for the modern explorer.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
};

export const sendEmailVerificationEmail = async ({
  toEmail,
  toName,
  verificationToken,
}: EmailVerificationInput): Promise<void> => {
  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");
  const from = process.env.SMTP_FROM?.trim() || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  const recipientName = toName?.trim() || "there";

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: "Verify your email - WAYNEXX",
    text: [
      `Hi ${recipientName},`,
      "",
      "Welcome to WAYNEXX! Please verify your email to activate your account.",
      `Your verification code is: ${verificationToken}`,
      "",
      "This code will expire in 24 hours.",
      "",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
          <table style="max-width: 600px; width: 100%; margin: 0 auto; border-collapse: collapse;">
            <!-- Header -->
            <tr style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 40px 20px;">
              <td style="padding: 40px 20px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; letter-spacing: 1px;">✈️ VOYAGEUR</div>
                <div style="font-size: 12px; opacity: 0.8; margin-top: 5px; letter-spacing: 2px;">CURATED TRAVEL EXPERIENCES</div>
              </td>
            </tr>

            <!-- Main Content -->
            <tr>
              <td style="padding: 40px 20px;">
                <div style="margin-bottom: 30px;">
                  <h2 style="color: #1a1a2e; font-size: 24px; margin: 0 0 15px 0;">Verify Your Email</h2>
                  <p style="color: #666; margin: 0 0 20px 0;">Hi ${recipientName},</p>
                  <p style="color: #666; margin: 0 0 25px 0;">Welcome to WAYNEXX! We're excited to have you. Please verify your email address to activate your account and start exploring amazing travel experiences.</p>
                </div>

                <!-- Code Display -->
                <div style="background: linear-gradient(135deg, #f0f4ff 0%, #f5f0ff 100%); border-left: 4px solid #6366f1; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
                  <div style="font-size: 12px; color: #666; margin-bottom: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</div>
                  <div style="font-size: 48px; font-weight: bold; color: #1a1a2e; font-family: 'Monaco', 'Courier New', monospace; letter-spacing: 12px; word-spacing: 5px;">
                    ${verificationToken}
                  </div>
                  <div style="font-size: 12px; color: #999; margin-top: 15px;">⏱️ Valid for 24 hours</div>
                </div>

                <!-- What You Can Do -->
                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 30px 0;">
                  <h3 style="color: #1a1a2e; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">Once verified, you can:</h3>
                  <ul style="color: #666; margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">📍 Book stays and attractions</li>
                    <li style="margin-bottom: 8px;">🚗 Reserve vehicles and rentals</li>
                    <li style="margin-bottom: 8px;">⭐ Leave reviews and ratings</li>
                    <li style="margin-bottom: 0;">💎 Unlock exclusive member benefits</li>
                  </ul>
                </div>

                <!-- Security Notice -->
                <div style="background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; border-radius: 4px; margin: 25px 0;">
                  <div style="color: #003d99; font-size: 13px; font-weight: 500;">
                    🔒 Keep this code private. WAYNEXX team will never ask for this code.
                  </div>
                </div>

                <!-- Footer Info -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 13px; margin: 0 0 8px 0;">
                    If you did not create this account, please ignore this email.
                  </p>
                  <p style="color: #999; font-size: 13px; margin: 0;">
                    Questions? Contact our support team at any time.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr style="background: #f5f5f5; border-top: 1px solid #ddd;">
              <td style="padding: 20px; text-align: center; font-size: 12px; color: #999;">
                <p style="margin: 0 0 5px 0;">© 2026 WAYNEXX. All rights reserved.</p>
                <p style="margin: 0;">Curated travel experiences for the modern explorer.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
};
