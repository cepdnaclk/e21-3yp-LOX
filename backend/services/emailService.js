const { EmailClient } = require("@azure/communication-email")

const connectionString = process.env.AZURE_ACS_CONNECTION_STRING
const senderAddress = process.env.AZURE_SENDER_EMAIL

console.log("[emailService] AZURE_ACS_CONNECTION_STRING:", connectionString ? "defined" : "undefined")
console.log("[emailService] AZURE_SENDER_EMAIL:", senderAddress ? "defined" : "undefined")

const emailClient = connectionString ? new EmailClient(connectionString) : null

const buildOtpEmailHtml = (otpCode) => `
  <div style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
      <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);border:1px solid #e5e7eb;">
        <div style="padding:32px 32px 24px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:#ffffff;">
          <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">Smart Locker Security</div>
          <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">Unrecognized device login detected</h1>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
            Someone is trying to log into your Smart Locker account from an unrecognized device.
            If this was you, use the verification code below to continue.
          </p>
          <div style="margin:28px 0;padding:20px;border-radius:14px;background:#f8fafc;border:1px solid #cbd5e1;text-align:center;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">Your one-time code</div>
            <div style="font-size:40px;font-weight:800;letter-spacing:0.18em;color:#0f172a;">${otpCode}</div>
            <div style="margin-top:12px;font-size:14px;color:#475569;">This code expires in 5 minutes.</div>
          </div>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
            If you did not attempt to sign in, you can ignore this email and no action is required.
          </p>
        </div>
      </div>
      <p style="margin:18px 4px 0;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
        This is an automated message from the Smart Locker security system.
      </p>
    </div>
  </div>
`

const sendOtpEmail = async (recipientEmail, otpCode) => {
  if (!emailClient) {
    throw new Error("AZURE_ACS_CONNECTION_STRING is not configured")
  }

  if (!senderAddress) {
    throw new Error("AZURE_SENDER_EMAIL is not configured")
  }

  if (!recipientEmail) {
    throw new Error("recipientEmail is required")
  }

  if (!otpCode) {
    throw new Error("otpCode is required")
  }

  const message = {
    senderAddress,
    content: {
      subject: "Smart Locker security code",
      html: buildOtpEmailHtml(otpCode)
    },
    recipients: {
      to: [{ address: recipientEmail }]
    }
  }

  const poller = await emailClient.beginSend(message)
  return poller.pollUntilDone()
}

module.exports = {
  sendOtpEmail
}
