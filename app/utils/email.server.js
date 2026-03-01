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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f9fafb; padding: 40px 0; }
    .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #1a1a1a; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.03); border: 1px solid #edf2f7; }
    .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 50px 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 30px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 12px 0 0; font-size: 18px; opacity: 0.9; font-weight: 400; }
    .content { padding: 45px 40px; line-height: 1.8; font-size: 16px; color: #4a5568; }
    .content h2 { color: #1a202c; font-size: 24px; font-weight: 700; margin-top: 0; margin-bottom: 20px; letter-spacing: -0.4px; }
    .features { margin: 30px 0; padding-left: 0; list-style: none; }
    .features li { margin-bottom: 15px; padding-left: 30px; position: relative; }
    .features li::before { content: '→'; position: absolute; left: 0; color: #007bff; font-weight: bold; }
    .tip { background-color: #ebf8ff; border-radius: 8px; padding: 25px; margin: 35px 0; color: #2c5282; border: 1px solid #bee3f8; }
    .feedback { background-color: #fffaf0; border-radius: 8px; padding: 25px; margin: 35px 0; color: #7b341e; border: 1px solid #feebc8; }
    .info-box { background-color: #f7fafc; border-radius: 8px; padding: 25px; margin: 30px 0; border: 1px solid #edf2f7; }
    .info-item { margin-bottom: 12px; display: block; }
    .info-label { font-weight: 700; color: #2d3748; min-width: 100px; display: inline-block; }
    .cta { text-align: center; margin: 45px 0; }
    .button { background-color: #007bff; color: #ffffff !important; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 18px; box-shadow: 0 4px 14px rgba(0,123,255,0.3); }
    .footer { text-align: center; padding: 35px 20px; font-size: 14px; color: #a0aec0; border-top: 1px solid #f7fafc; background-color: #ffffff; }
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
              <td class="header" style="background: #1a202c;">
                <h1>New Inquiry Received</h1>
                <p>Support ticket from your app store</p>
              </td>
            </tr>
            <tr>
              <td class="content">
                <h2>Message Details</h2>
                <div class="info-box">
                  <span class="info-item"><span class="info-label">Customer:</span> ${customerName}</span>
                  <span class="info-item"><span class="info-label">Email:</span> ${customerEmail}</span>
                  <span class="info-item"><span class="info-label">Store:</span> ${shopDomain}</span>
                </div>
                <div style="background: #fff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-top: 20px;">
                  <p style="margin: 0; color: #2d3748; font-style: italic;">"${message.replace(/\n/g, "<br>")}"</p>
                </div>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p>Reply directly to this email to contact the merchant.</p>
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
                <h1>Welcome to Fusion Upsell Bundle 🚀</h1>
                <p>Turn more orders into bigger revenue</p>
              </td>
            </tr>
            <tr>
              <td class="content">
                <h2>You're officially in!</h2>

                <p>
                  Thank you for installing <strong>Fusion Upsell Bundle</strong>.  
                  You're now equipped with powerful tools to increase your store’s average order value and create smarter product offers that customers love.
                </p>

                <p><strong>Here’s what you can start doing right away:</strong></p>

                <ul class="features">
                  <li>Create high-converting product bundles in minutes</li>
                  <li>Offer quantity breaks and tiered discounts</li>
                  <li>Design custom upsell offers that match your brand</li>
                  <li>Show bundles directly on product or bundle pages</li>
                  <li>Encourage customers to buy more with smart incentives</li>
                </ul>

                <div class="tip">
                  <strong>Quick Start Tip:</strong><br>
                  Launch a simple “Buy More, Save More” bundle first — it's one of the fastest ways to boost conversions and revenue.
                </div>

                <div class="cta">
                  <a href="https://apps.shopify.com/bundle-builder-6" class="button">
                    Open Your App Dashboard
                  </a>
                </div>

                <p>
                  Need help setting things up or want optimization tips?  
                  Just reply to this email — our team is always happy to help.
                </p>

                <p>
                  Let’s grow your store together 💙
                </p>

                <p><strong>Team Fusion Upsell Bundle</strong></p>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p>© 2026 Fusion Upsell Bundle. All rights reserved.</p>
                <p>You’re receiving this email because you installed Fusion Upsell Bundle on Shopify.</p>
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
              <td class="header" style="background-color: #6c757d;">
                <h1>We’re Sorry to See You Go 💙</h1>
                <p>Thanks for trying Fusion Upsell Bundle</p>
              </td>
            </tr>
            <tr>
              <td class="content">
                <p>Hi there,</p>
                <p>
                  We noticed that you’ve uninstalled <strong>Fusion Upsell Bundle</strong>, and we just wanted to say thank you for giving us a try.  
                  We truly appreciate the opportunity to be part of your store’s growth journey.
                </p>
                <p>
                  If something didn’t work the way you expected, we’d really love to learn from your experience so we can improve.
                </p>
                <div class="feedback">
                  <strong>Help us improve:</strong><br>
                  What made you decide to uninstall? Your feedback means a lot to us and helps make the app better for everyone.
                </div>
                <div class="cta">
                  <a href="https://apps.shopify.com/bundle-builder-6" class="button" style="background-color: #6c757d;">
                    Reinstall Fusion Upsell Bundle
                  </a>
                </div>
                <p>
                  If you ever decide to come back, we’ll be here to help you boost conversions and grow your revenue.
                </p>
                <p>
                  Wishing you continued success with your store 🚀
                </p>
                <p><strong>Team Fusion Upsell Bundle</strong></p>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p>© 2026 Fusion Upsell Bundle. All rights reserved.</p>
                <p>This email was sent following your app uninstall.</p>
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
              <td class="header" style="background: #e53e3e;">
                <h1>App Uninstalled</h1>
                <p>Activity Alert</p>
              </td>
            </tr>
            <tr>
              <td class="content">
                <p>The following store has uninstalled <strong>Fusion Upsell Bundle</strong>:</p>
                <div class="info-box">
                  <span class="info-item"><span class="info-label">Shop Domain:</span> ${shopDomain}</span>
                  <span class="info-item"><span class="info-label">Contact Email:</span> ${email || "Not available"}</span>
                  <span class="info-item"><span class="info-label">Phone:</span> ${phone || "Not available"}</span>
                </div>
                <p style="margin-top: 25px;">Consider reaching out to the merchant to understand their experience and see if they'd like to share any feedback.</p>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p>Admin Notification | Fusion Upsell Bundle</p>
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
