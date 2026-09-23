import nodemailer from 'nodemailer';

/**
 * Initialize Nodemailer Transporter
 */
const getTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const secure = process.env.EMAIL_SECURE === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || user.includes('your-email') || !pass || pass.includes('your-app-password')) {
    throw new Error('Email credentials missing in backend/.env. Please configure EMAIL_USER and EMAIL_APP_PASSWORD.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure, // false for port 587 with STARTTLS
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Send real HTML OTP Verification Email via Nodemailer
 */
export const sendOTPEmail = async (toEmail, otp, purpose = 'Email Verification') => {
  if (!toEmail || !toEmail.trim()) {
    throw new Error('Target email address is required.');
  }

  const cleanEmail = toEmail.trim().toLowerCase();
  const transporter = getTransporter();

  const titleText = purpose === 'password_reset' ? 'Password Reset Verification' : 'Email Verification Code';
  const subjectLine = `KalaSaathi - ${titleText} (${otp})`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background-color: #F6F3EE; border-radius: 16px;">
      <div style="background-color: #ffffff; padding: 28px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        
        <!-- Header Logo -->
        <div style="margin-bottom: 20px; text-align: left;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a;">
            Kala<span style="color: #c2410c;">Saathi</span>
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 600; color: #c2410c;">
            Your Digital Artisan Manager
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 16px 0;" />

        <p style="font-size: 15px; color: #334155; margin-bottom: 8px;">Hello,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 20px;">
          Your verification code for <strong>${titleText}</strong> is:
        </p>

        <!-- OTP Code Box -->
        <div style="background-color: #fff7ed; border: 1.5px dashed #f97316; padding: 18px; text-align: center; border-radius: 12px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #c2410c; margin: 24px 0;">
          ${otp}
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">
          ⏱️ This code will expire in <strong>5 minutes</strong>.
        </p>
        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 20px;">
          If you did not request this code, you can safely ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />

        <p style="font-size: 12px; color: #64748b; margin: 0;">
          Warm regards,<br />
          <strong style="color: #0f172a;">KalaSaathi Team</strong>
        </p>
      </div>
    </div>
  `;

  console.log(`[SMTP] Sending OTP email to ${cleanEmail}...`);

  const mailOptions = {
    from: `"KalaSaathi Team" <${process.env.EMAIL_USER}>`,
    to: cleanEmail,
    subject: subjectLine,
    html: htmlContent
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[SMTP] Email sent successfully to ${cleanEmail}. Message ID: ${info.messageId}`);

  return {
    success: true,
    messageId: info.messageId,
    email: cleanEmail
  };
};
