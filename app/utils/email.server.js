import { SendMailClient } from "zeptomail";

/**
 * ZeptoMail Region endpoints:
 * US: https://api.zeptomail.com/
 * EU: https://api.zeptomail.eu/
 * IN: https://api.zeptomail.in/
 * CN: https://api.zeptomail.com.cn/
 * AU: https://api.zeptomail.com.au/
 */
const ZEPTOMAIL_URL = process.env.ZEPTOMAIL_URL || "https://api.zeptomail.in/";
const ZEPTOMAIL_TOKEN = process.env.ZEPTOMAIL_TOKEN ? process.env.ZEPTOMAIL_TOKEN.trim() : null;
const SENDER_EMAIL = process.env.ZEPTOMAIL_SENDER_EMAIL || "support@fusioncommerce.online";
const SENDER_NAME = process.env.ZEPTOMAIL_SENDER_NAME || "Bundle Builder Support";
const ADMIN_EMAIL = process.env.CONTACT_ADMIN_EMAIL || SENDER_EMAIL;

export async function sendContactEmails({ customerName, customerEmail, message, shopDomain }) {
  console.log("Email server: sendContactEmails started");
  console.log("ZEPTOMAIL_URL:", ZEPTOMAIL_URL);
  console.log("ZEPTOMAIL_TOKEN presence:", ZEPTOMAIL_TOKEN ? `Yes (starts with ${ZEPTOMAIL_TOKEN.substring(0, 10)}...)` : "No");

  if (!ZEPTOMAIL_TOKEN) {
    console.error("ZEPTOMAIL_TOKEN is not set in environment variables");
    throw new Error("Email service is not configured.");
  }

  let client;
  try {
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
