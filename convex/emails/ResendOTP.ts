const OTP_LENGTH = 8;
const OTP_EXPIRY_SECONDS = 60 * 15; // 15 minutes

function generateOTP(): string {
  const digits = "0123456789";
  const result: string[] = [];
  // Rejection sampling for uniform distribution: reject values >= 250
  // to avoid modulo bias (256 % 10 = 6, so 0-5 would be overrepresented)
  while (result.length < OTP_LENGTH) {
    const batch = new Uint8Array(OTP_LENGTH * 2);
    crypto.getRandomValues(batch);
    for (const byte of batch) {
      if (result.length >= OTP_LENGTH) break;
      if (byte < 250) {
        result.push(digits[byte % 10]);
      }
    }
  }
  return result.join("");
}

export const ResendOTP = {
  id: "resend-otp",
  type: "email" as const,
  name: "Resend OTP",
  from: "Vertex",
  maxAge: OTP_EXPIRY_SECONDS,

  generateVerificationToken() {
    return generateOTP();
  },

  async sendVerificationRequest({
    identifier: email,
    token,
  }: {
    identifier: string;
    url: string;
    expires: Date;
    provider: { from?: string };
    token: string;
  }) {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      throw new Error("Missing AUTH_RESEND_KEY environment variable");
    }

    const from = process.env.AUTH_EMAIL_FROM;
    if (!from) {
      throw new Error("Missing AUTH_EMAIL_FROM environment variable");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Vertex — Verification Code",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 24px;">Verification Code</h2>
            <p style="color: #4a4a4a; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
              Use the code below to complete your request. This code expires in 15 minutes.
            </p>
            <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #1a1a1a;">
                ${token}
              </span>
            </div>
            <p style="color: #9a9a9a; font-size: 13px; line-height: 1.5;">
              If you did not request this code, you can safely ignore this email.
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to send verification email: ${body}`);
    }
  },
};
