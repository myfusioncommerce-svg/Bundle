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
    const result = await client.sendMail({
      from: {
        address: SENDER_EMAIL,
        name: SENDER_NAME,
      },
      to: [
        {
          email_address: {
            address: ADMIN_EMAIL, // Send to admin email from ENV
            name: SENDER_NAME,
          },
        },
      ],
      reply_to: [
        {
          address: customerEmail,
          name: customerName,
        },
      ],
      subject: `New Contact Form Submission from ${shopDomain}`,
      htmlbody: `
        <div>
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${customerName}</p>
          <p><strong>Email:</strong> ${customerEmail}</p>
          <p><strong>Shop:</strong> ${shopDomain}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        </div>
      `,
    });

    return { success: true, message: "Email sent successfully", result };
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
        <style>
          .header { text-align: center; padding: 20px; background-color: #f8f9fa; }
          .content { padding: 30px; line-height: 1.6; color: #333; font-family: sans-serif; }
          .features { margin: 20px 0; padding-left: 20px; }
          .tip { background-color: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; }
          .cta { text-align: center; margin: 30px 0; }
          .button { background-color: #007bff; color: white !important; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; border-top: 1px solid #eee; }
        </style>
        <div class="header">
          <h1>Welcome to Fusion Upsell Bundle 🚀</h1>
          <p>Turn more orders into bigger revenue</p>
        </div>

        <div class="content">
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
        </div>

        <div class="footer">
          © 2026 Fusion Upsell Bundle. All rights reserved.<br>
          You’re receiving this email because you installed Fusion Upsell Bundle on Shopify.
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
      subject: `Sorry to See You Go — Fusion Upsell Bundle`,
      htmlbody: `
        <style>
          .header { text-align: center; padding: 20px; background-color: #f8f9fa; }
          .content { padding: 30px; line-height: 1.6; color: #333; font-family: sans-serif; }
          .feedback { background-color: #fcf8e3; border-left: 4px solid #8a6d3b; padding: 15px; margin: 20px 0; color: #8a6d3b; }
          .cta { text-align: center; margin: 30px 0; }
          .button { background-color: #007bff; color: white !important; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; border-top: 1px solid #eee; }
        </style>
        <div class="header">
          <h1>We’re Sorry to See You Go 💙</h1>
          <p>Thanks for trying Fusion Upsell Bundle</p>
        </div>

        <div class="content">
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
            <a href="https://apps.shopify.com/bundle-builder-6" class="button">
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
        </div>

        <div class="footer">
          © 2026 Fusion Upsell Bundle. All rights reserved.<br>
          This email was sent following your app uninstall.
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
        <div style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: #d9534f;">App Uninstalled</h1>
          <p>The following store has uninstalled <strong>Fusion Upsell Bundle</strong>:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #eee; font-weight: bold; width: 30%;">Shop Domain:</td>
              <td style="padding: 10px; border: 1px solid #eee;">${shopDomain}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #eee; font-weight: bold;">Contact Email:</td>
              <td style="padding: 10px; border: 1px solid #eee;">${email || "Not available"}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #eee; font-weight: bold;">Phone Number:</td>
              <td style="padding: 10px; border: 1px solid #eee;">${phone || "Not available"}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">You might want to reach out and ask for feedback!</p>
        </div>
      `,
    });
    console.log(`Admin uninstall notification sent for ${shopDomain}`);
  } catch (error) {
    console.error("Error sending admin uninstall notification:", error);
  }
}
