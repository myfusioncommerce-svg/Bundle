import { SendMailClient } from "zeptomail";

/**
 * ZeptoMail Region endpoints:
 * US: https://api.zeptomail.com/
 * EU: https://api.zeptomail.eu/
 * IN: https://api.zeptomail.in/
 * CN: https://api.zeptomail.com.cn/
 * AU: https://api.zeptomail.com.au/
 */
// Using the exact format from ZeptoMail documentation
const ZEPTOMAIL_URL = process.env.ZEPTOMAIL_URL || "https://api.zeptomail.in/v1.1/email";
const ZEPTOMAIL_TOKEN = process.env.ZEPTOMAIL_TOKEN ? process.env.ZEPTOMAIL_TOKEN.trim() : null;

let senderAddress = process.env.ZEPTOMAIL_SENDER_EMAIL || "support@fusioncommerce.online";
if (senderAddress && !senderAddress.includes("@")) {
  senderAddress = `noreply@${senderAddress}`;
}
const SENDER_EMAIL = senderAddress;
const SENDER_NAME = process.env.ZEPTOMAIL_SENDER_NAME || "Bundle Builder Support";
const ADMIN_EMAIL = process.env.CONTACT_ADMIN_EMAIL || SENDER_EMAIL;

const COMMON_EMAIL_STYLE = `
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0f172a; padding: 60px 0; }
    .main { background-color: #1e293b; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #f8fafc; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 60px 40px; text-align: center; color: #ffffff; position: relative; }
    .header h1 { margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.025em; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header p { margin: 16px 0 0; font-size: 18px; opacity: 0.95; font-weight: 500; }
    .content { padding: 50px 50px; line-height: 1.8; font-size: 16px; color: #cbd5e1; background-color: #1e293b; }
    .content h2 { color: #ffffff; font-size: 24px; font-weight: 700; margin-top: 0; margin-bottom: 24px; letter-spacing: -0.025em; }
    .features { margin: 32px 0; padding-left: 0; list-style: none; }
    .features li { margin-bottom: 16px; padding-left: 32px; position: relative; color: #e2e8f0; }
    .features li::before { content: '✓'; position: absolute; left: 0; top: 2px; width: 22px; height: 22px; background-color: #064e3b; color: #4ade80; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; font-weight: bold; }
    .tip { background: linear-gradient(90deg, #064e3b 0%, #065f46 100%); border-radius: 12px; padding: 24px; margin: 40px 0; color: #dcfce7; border: 1px solid #059669; }
    .feedback { background: linear-gradient(90deg, #451a03 0%, #78350f 100%); border-radius: 12px; padding: 24px; margin: 40px 0; color: #ffedd5; border: 1px solid #92400e; }
    .info-box { background-color: #334155; border-radius: 12px; padding: 30px; margin: 32px 0; border: 1px solid #475569; }
    .info-item { margin-bottom: 14px; display: block; font-size: 15px; color: #f1f5f9; }
    .info-label { font-weight: 600; color: #94a3b8; width: 120px; display: inline-block; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
    .cta { text-align: center; margin: 50px 0; }
    .button { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff !important; padding: 20px 45px; text-decoration: none; border-radius: 12px; font-weight: 700; display: inline-block; font-size: 18px; box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.4); transition: transform 0.2s; }
    .footer { text-align: center; padding: 40px 20px; font-size: 14px; color: #64748b; background-color: #0f172a; border-top: 1px solid #1e293b; }
    .footer p { margin: 8px 0; }
  </style>
`;

export async function sendContactEmails({ customerName, customerEmail, message, shopDomain }) {
  console.log("--- Email Send Attempt ---");
  console.log("Target URL:", ZEPTOMAIL_URL);
  console.log("Sender Email:", SENDER_EMAIL);
  console.log("Admin Email (Recipient):", ADMIN_EMAIL);
  
  if (ZEPTOMAIL_TOKEN) {
    const start = ZEPTOMAIL_TOKEN.substring(0, 20);
    const end = ZEPTOMAIL_TOKEN.substring(ZEPTOMAIL_TOKEN.length - 8);
    console.log(`Token Verification: ${start}...${end} (Length: ${ZEPTOMAIL_TOKEN.length})`);
  } else {
    console.log("Token Verification: MISSING");
  }

  if (!ZEPTOMAIL_TOKEN) {
    console.error("ZEPTOMAIL_TOKEN is not set in environment variables");
    throw new Error("Email service is not configured.");
  }

  let client;
  try {
    // The SDK expects the URL and Token as defined in your dashboard
    client = new SendMailClient({
      url: ZEPTOMAIL_URL,
      token: ZEPTOMAIL_TOKEN,
    });
  } catch (urlError) {
    console.error("Failed to initialize ZeptoMail client. Check ZEPTOMAIL_URL:", ZEPTOMAIL_URL);
    throw new Error(`Invalid Email Service Configuration: ${urlError.message}`);
  }

  try {
    // 1. Send notification to ADMIN
    await client.sendMail({
      from: {
        address: SENDER_EMAIL,
        name: SENDER_NAME,
      },
      to: [
        {
          email_address: {
            address: ADMIN_EMAIL,
            name: "Admin",
          },
        },
      ],
      reply_to: [
        {
          address: customerEmail,
          name: customerName,
        },
      ],
      subject: `New Inquiry from ${customerName} | ${shopDomain}`,
      htmlbody: `
        ${COMMON_EMAIL_STYLE}
        <div class="wrapper">
          <table class="main">
            <tr>
              <td class="header" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
                <h1>New Inquiry Received</h1>
                <p>Merchant Support Request</p>
              </td>
            </tr>
            <tr>
              <td class="content">
                <h2>Message Details</h2>
                <div class="info-box">
                  <span class="info-item"><span class="info-label">Customer:</span> <strong style="color: #111827;">${customerName}</strong></span>
                  <span class="info-item"><span class="info-label">Email:</span> <strong style="color: #111827;">${customerEmail}</strong></span>
                  <span class="info-item"><span class="info-label">Store:</span> <strong style="color: #111827;">${shopDomain}</strong></span>
                </div>
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; margin-top: 24px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                  <p style="margin: 0; color: #1e293b; font-style: italic; font-size: 17px; line-height: 1.8;">"${message.replace(/\n/g, "<br>")}"</p>
                </div>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p>Action Required: Please respond to the merchant promptly.</p>
                <p>Fusion Upsell Bundle | Admin Dashboard</p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    // 2. Send acknowledgment to CUSTOMER
    await client.sendMail({
      from: {
        address: SENDER_EMAIL,
        name: SENDER_NAME,
      },
      to: [
        {
          email_address: {
            address: customerEmail,
            name: customerName,
          },
        },
      ],
      subject: `We've received your message — Fusion Upsell Bundle`,
      htmlbody: `
        ${COMMON_EMAIL_STYLE}
        <div class="wrapper">
          <table class="main">
            <tr>
              <td class="header">
                <h1>Message Received ✉️</h1>
                <p>We're on it!</p>
              </td>
            </tr>
            <tr>
              <td class="content">
                <h2>Hi ${customerName},</h2>
                <p>
                  Thank you for reaching out to **Fusion Upsell Bundle**. This is a quick note to let you know that we've received your message and our team is already reviewing it.
                </p>
                <p>
                  We typically respond within **24 hours** during business days. We appreciate your patience as we look into your inquiry.
                </p>
                <div class="tip">
                  <strong>Did you know?</strong><br>
                  You can often find quick answers in our <strong>FAQ</strong> section directly within the app dashboard.
                </div>
                <p>Talk to you soon!</p>
                <p><strong>Team Fusion Upsell Bundle</strong></p>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p>© 2026 Fusion Upsell Bundle. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("ZeptoMail Error:", error);
    if (error && typeof error === 'object' && !error.message) {
      // Some SDKs might throw objects that need to be stringified or checked for specific error keys
      throw new Error(JSON.stringify(error) || "Unknown ZeptoMail error");
    }
    throw error;
  }
}

export async function sendWelcomeEmail({ shopDomain, email }) {
  if (!ZEPTOMAIL_TOKEN) return;

  const client = new SendMailClient({
    url: ZEPTOMAIL_URL,
    token: ZEPTOMAIL_TOKEN,
  });

  try {
    await client.sendMail({
      from: {
        address: SENDER_EMAIL,
        name: SENDER_NAME,
      },
      to: [
        {
          email_address: {
            address: email || ADMIN_EMAIL,
            name: shopDomain,
          },
        },
      ],
      subject: `Welcome to Fusion Upsell Bundle — Start Building High-Converting Bundles Today 🚀`,
      htmlbody: `
        ${COMMON_EMAIL_STYLE}
        <div class="wrapper">
          <table class="main">
            <tr>
              <td class="header">
                <h1>🚀 Welcome to Fusion Upsell Bundle</h1>
                <p>Turn more orders into bigger revenue 💰</p>
              </td>
            </tr>
            <tr>
              <td class="content">
                <h2>🎉 You're officially in!</h2>

                <p>
                  Thank you for installing <strong>Fusion Upsell Bundle</strong>. You're now equipped with powerful tools to
                  <strong>increase your store’s average order value 📈</strong> and create smarter product offers your customers love ❤️
                </p>

                <div style="border-top: 1px solid #334155; margin: 30px 0;"></div>

                <h3 style="color: #ffffff; font-size: 20px; margin-bottom: 20px;">⚡ What you can do right away:</h3>

                <ul class="features">
                  <li>✨ Create high-converting product bundles in minutes</li>
                  <li>📊 Offer quantity breaks and tiered discounts</li>
                  <li>🎯 Design custom upsell offers matching your brand</li>
                  <li>🛍️ Show bundles directly on product or bundle pages</li>
                  <li>🚀 Encourage customers to buy more with smart incentives</li>
                </ul>

                <div style="border-top: 1px solid #334155; margin: 30px 0;"></div>

                <div class="tip">
                  <h3 style="margin-top: 0; color: #4ade80; font-size: 18px;">💡 Quick Start Tip</h3>
                  <p>
                    Launch a simple <strong>“Buy More, Save More”</strong> bundle — one of the fastest ways to boost conversions and revenue instantly 📈
                  </p>
                </div>

                <div class="cta">
                  <a href="https://apps.shopify.com/bundle-builder-6" class="button">
                    👉 Open Your App Dashboard
                  </a>
                </div>

                <div style="border-top: 1px solid #334155; margin: 30px 0;"></div>

                <p>
                  🤝 Need help setting things up or want optimization tips?  
                  Just reply to this email — our team is always happy to help 😊
                </p>

                <p style="margin-top: 30px; font-weight: 500; color: #ffffff;">
                  💙 Let’s grow your store together!
                </p>

                <p>
                  <strong>Team Fusion Upsell Bundle</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p>© 2026 Fusion Upsell Bundle. All rights reserved.</p>
                <p>You received this email because you installed Fusion Upsell Bundle on Shopify.</p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });
    console.log(`Welcome email sent to ${shopDomain}`);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
}

export async function sendGoodbyeEmail({ shopDomain, email }) {
  if (!ZEPTOMAIL_TOKEN) return;

  const client = new SendMailClient({
    url: ZEPTOMAIL_URL,
    token: ZEPTOMAIL_TOKEN,
  });

  try {
    if (!email) {
      console.log(`Skipping goodbye email for ${shopDomain} - no email address available.`);
      return;
    }

    await client.sendMail({
      from: {
        address: SENDER_EMAIL,
        name: SENDER_NAME,
      },
      to: [
        {
          email_address: {
            address: email,
            name: shopDomain,
          },
        },
      ],
      subject: `Sorry to See You Go — Fusion Upsell Bundle`,
      htmlbody: `
        ${COMMON_EMAIL_STYLE}
        <div class="wrapper">
          <table class="main">
            <tr>
              <td class="header" style="background: linear-gradient(135deg, #475569 0%, #1e293b 100%);">
                <h1>We’re Sorry to See You Go 💙</h1>
                <p>Thank you for giving us a try</p>
              </td>
            </tr>
            <tr>
              <td class="content">
                <p>Hi there,</p>
                <p>
                  We noticed that you’ve uninstalled <strong>Fusion Upsell Bundle</strong>, and we just wanted to say thank you for giving us a try.  
                  We truly appreciate the opportunity to have been part of your store’s journey.
                </p>

                <div style="border-top: 1px solid #334155; margin: 30px 0;"></div>

                <p>
                  If something didn’t work the way you expected, we’d really love to learn from your experience so we can improve for other merchants.
                </p>

                <div class="feedback">
                  <h3 style="margin-top: 0; color: #ffedd5; font-size: 18px;">✍️ Help us improve</h3>
                  <p>
                    What made you decide to uninstall? Your feedback helps us build a better tool for the Shopify community.
                  </p>
                </div>

                <div class="cta">
                  <a href="https://apps.shopify.com/bundle-builder-6" class="button">
                    🚀 Reinstall Fusion Upsell Bundle
                  </a>
                </div>

                <div style="border-top: 1px solid #334155; margin: 30px 0;"></div>

                <p>
                  If you ever decide to come back, we’ll be here ready to help you boost conversions and grow your revenue.
                </p>
                <p>
                  Wishing you continued success with your store 🚀
                </p>
                <p style="margin-top: 30px;"><strong>Team Fusion Upsell Bundle</strong></p>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p>© 2026 Fusion Upsell Bundle. All rights reserved.</p>
                <p>This email was sent following your app uninstallation.</p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });
    console.log(`Goodbye email sent to ${shopDomain}`);
  } catch (error) {
    console.error("Error sending goodbye email:", error);
  }
}

export async function sendAdminUninstallNotification({ shopDomain, email, phone }) {
  if (!ZEPTOMAIL_TOKEN) return;

  const client = new SendMailClient({
    url: ZEPTOMAIL_URL,
    token: ZEPTOMAIL_TOKEN,
  });

  try {
    await client.sendMail({
      from: {
        address: SENDER_EMAIL,
        name: SENDER_NAME,
      },
      to: [
        {
          email_address: {
            address: ADMIN_EMAIL,
            name: "Admin",
          },
        },
      ],
      subject: `🚨 Alert: App Uninstalled by ${shopDomain}`,
      htmlbody: `
        ${COMMON_EMAIL_STYLE}
        <div class="wrapper">
          <table class="main">
            <tr>
              <td class="header" style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);">
                <h1>App Uninstalled</h1>
                <p>Merchant Activity Alert</p>
              </td>
            </tr>
            <tr>
              <td class="content">
                <p>The following store has uninstalled <strong>Fusion Upsell Bundle</strong>:</p>
                <div class="info-box">
                  <span class="info-item"><span class="info-label">Shop Domain:</span> <strong style="color: #111827;">${shopDomain}</strong></span>
                  <span class="info-item"><span class="info-label">Contact Email:</span> <strong style="color: #111827;">${email || "Not available"}</strong></span>
                  <span class="info-item"><span class="info-label">Phone:</span> <strong style="color: #111827;">${phone || "Not available"}</strong></span>
                </div>
                <p style="margin-top: 25px; color: #4b5563;">Consider reaching out to the merchant to understand their experience and see if they'd like to share any feedback.</p>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p>Admin Notification | Fusion Upsell Bundle</p>
                <p>Generated automatically by your Shopify App</p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });
    console.log(`Admin uninstall notification sent for ${shopDomain}`);
  } catch (error) {
    console.error("Error sending admin uninstall notification:", error);
  }
}
