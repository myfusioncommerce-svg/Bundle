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
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
    
    :root {
      --ink: #1a1523;
      --ink-muted: #6b6578;
      --cream: #faf8f5;
      --surface: #ffffff;
      --accent: #c8553d;
      --accent-light: #fdf0ed;
      --accent-dark: #a8402a;
      --gold: #e8a838;
      --border: #ebe8e2;
    }

    body { font-family: 'Inter', -apple-system, sans-serif; background-color: #f0ede8; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; color: #1a1523; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f0ede8; padding: 40px 0; }
    .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 32px rgba(26,21,35,.10); }
    
    .client-chrome { background: #2d2a35; padding: 14px 20px; text-align: left; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; }
    
    .hero { background: linear-gradient(135deg, #1a1523 0%, #2f2340 60%, #3d2a52 100%); padding: 52px 40px; text-align: center; color: #faf8f5; }
    .hero-eyebrow { display: inline-block; font-size: 11px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: #e8a838; background: rgba(232,168,56,.12); border: 1px solid rgba(232,168,56,.25); padding: 5px 14px; border-radius: 100px; margin-bottom: 24px; }
    .hero h1 { font-family: 'DM Serif Display', serif; font-size: 38px; line-height: 1.15; margin: 0 0 12px; font-weight: 400; }
    .hero h1 em { font-style: italic; color: #e8a0a0; }
    .hero-sub { font-size: 14px; opacity: 0.6; margin: 0; }

    .content { padding: 44px 48px; line-height: 1.8; font-size: 15px; color: #3d3749; }
    .greeting { font-size: 17px; font-weight: 500; margin-bottom: 16px; color: #1a1523; }
    
    .highlight-box { background: #fdf0ed; border-left: 3px solid #c8553d; border-radius: 0 10px 10px 0; padding: 24px; margin: 28px 0; }
    .hb-label { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #c8553d; margin-bottom: 12px; }
    .features { margin: 0; padding: 0; list-style: none; }
    .features li { margin-bottom: 10px; padding-left: 20px; position: relative; font-size: 14px; }
    .features li::before { content: '✦'; position: absolute; left: 0; color: #c8553d; font-size: 10px; }

    .incentive { background: #fef9ee; border: 1.5px dashed rgba(232,168,56,.4); border-radius: 12px; padding: 20px 24px; margin: 28px 0; display: table; width: 100%; box-sizing: border-box; }
    .incentive-icon { font-size: 32px; display: table-cell; vertical-align: middle; width: 50px; }
    .incentive-text { display: table-cell; vertical-align: middle; font-size: 14px; }
    .incentive-label { font-size: 11px; font-weight: 700; color: #e8a838; text-transform: uppercase; margin-bottom: 4px; }

    .cta-block { text-align: center; margin: 40px 0; }
    .button { background: #c8553d; color: #ffffff !important; padding: 16px 40px; text-decoration: none; border-radius: 100px; font-weight: 600; display: inline-block; font-size: 15px; box-shadow: 0 4px 20px rgba(200,85,61,.35); }
    
    .footer { text-align: center; padding: 32px 48px; font-size: 12px; color: #a09bab; background-color: #faf8f5; border-top: 1px solid #ebe8e2; }
    .footer a { color: #6b6578; text-decoration: none; margin: 0 10px; }
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
              <td class="client-chrome">
                <div class="dot" style="background: #ff5f57;"></div>
                <div class="dot" style="background: #febc2e;"></div>
                <div class="dot" style="background: #28c840;"></div>
              </td>
            </tr>
            <tr>
              <td class="hero">
                <div class="hero-eyebrow">You're officially in</div>
                <h1>Welcome to<br><em>Fusion Upsell.</em></h1>
                <p class="hero-sub">Turn more orders into bigger revenue, starting today.</p>
              </td>
            </tr>
            <tr>
              <td class="content">
                <p class="greeting">Hey there,</p>
                <p>
                  Thank you for installing <strong>Fusion Upsell Bundle</strong>. You're now equipped with powerful tools to
                  increase your store’s average order value and create smarter product offers your customers love.
                </p>

                <div class="highlight-box">
                  <div class="hb-label">What you can do right away</div>
                  <ul class="features">
                    <li>Create high-converting product bundles in minutes</li>
                    <li>Offer quantity breaks and tiered discounts</li>
                    <li>Design custom upsell offers matching your brand</li>
                    <li>Show bundles directly on product pages</li>
                    <li>Encourage customers to buy more with smart incentives</li>
                  </ul>
                </div>

                <div class="incentive">
                  <div class="incentive-icon">🎁</div>
                  <div class="incentive-text">
                    <div class="incentive-label">Quick Start Tip</div>
                    <p>Launch a simple <strong>“Buy More, Save More”</strong> bundle — it's the fastest way to boost conversions instantly.</p>
                  </div>
                </div>

                <div class="cta-block">
                  <a href="https://apps.shopify.com/bundle-builder-6" class="button">
                    Open Your App Dashboard →
                  </a>
                </div>

                <p style="font-size: 14px; color: #6b6578;">
                  Need help setting things up? Just reply to this email — our team is always happy to help.
                </p>

                <p style="margin-top: 30px; font-weight: 500;">
                  Let’s grow your store together 💙
                </p>

                <p>
                  <strong>Team Fusion Upsell Bundle</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <div style="margin-bottom: 15px;">
                  <a href="#">Manage preferences</a>
                  <a href="#">View in browser</a>
                </div>
                <p>© 2026 Fusion Upsell Bundle · Shopify App Store</p>
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
              <td class="client-chrome">
                <div class="dot" style="background: #ff5f57;"></div>
                <div class="dot" style="background: #febc2e;"></div>
                <div class="dot" style="background: #28c840;"></div>
              </td>
            </tr>
            <tr>
              <td class="hero">
                <div class="hero-eyebrow">We're sorry to see you go</div>
                <h1>We <em>miss</em> you,<br>already.</h1>
                <p class="hero-sub">Thank you for giving Fusion Upsell a try.</p>
              </td>
            </tr>
            <tr>
              <td class="content">
                <p class="greeting">Hi there,</p>
                <p>
                  We noticed you've uninstalled <strong>Fusion Upsell Bundle</strong>. We truly appreciate the opportunity 
                  to have been part of your store's journey, even if only for a short time.
                </p>

                <div class="highlight-box">
                  <div class="hb-label">✍️ Help us improve</div>
                  <p style="font-size: 14px; margin: 0;">
                    What made you decide to uninstall? We read every piece of feedback, and it helps us build a better tool 
                    for the entire Shopify community.
                  </p>
                </div>

                <div class="cta-block">
                  <a href="https://apps.shopify.com/bundle-builder-6" class="button">
                    Take me back to the app →
                  </a>
                  <p style="font-size: 11px; color: #6b6578; margin-top: 12px;">One click. Your data is exactly where you left it.</p>
                </div>

                <div style="border-top: 1px solid #ebe8e2; margin: 32px 0;"></div>

                <p style="font-size: 14px; color: #6b6578;">
                  If you ever decide to come back, we'll be here ready to help you boost conversions and grow your revenue.
                </p>

                <p style="margin-top: 30px; font-weight: 500;">
                  Wishing you continued success 🚀
                </p>

                <p>
                  <strong>Team Fusion Upsell Bundle</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <div style="margin-bottom: 15px;">
                  <a href="#">Manage preferences</a>
                  <a href="#">Reinstall app</a>
                  <a href="#">Unsubscribe</a>
                </div>
                <p>© 2026 Fusion Upsell Bundle · Sent after app uninstallation</p>
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
