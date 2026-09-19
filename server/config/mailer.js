import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to, resetLink) {
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Reset your E-SafetyRides password',
    html: `
      <div style="font-family: 'IBM Plex Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #F7F5F1;">
        <h1 style="color: #082F30; font-size: 22px; margin-bottom: 4px;">E-Safety<span style="color:#FF7A45;">Rides</span></h1>
        <p style="color: #16221F; font-size: 15px; line-height: 1.5;">
          We received a request to reset your password. This link expires in 1 hour.
        </p>
        <a href="${resetLink}"
           style="display: inline-block; background: #FF7A45; color: #fff; text-decoration: none;
                  padding: 12px 24px; border-radius: 10px; font-weight: 600; margin: 16px 0;">
          Reset password
        </a>
        <p style="color: #5B6B68; font-size: 13px; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
        <p style="color: #5B6B68; font-size: 12px; word-break: break-all; margin-top: 24px;">
          Or paste this link into your browser: ${resetLink}
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Resend error:', error);
    throw new Error('Failed to send reset email');
  }
}
