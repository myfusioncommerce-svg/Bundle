import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendGoodbyeEmail, sendAdminUninstallNotification } from "../utils/email.server";

export const action = async ({ request }) => {
  const { shop, session, topic, admin } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Fetch shop email from the database directly by shop name
  const storedSession = await db.session.findFirst({
    where: { shop, email: { not: null } },
    orderBy: { id: 'desc' }
  });
  
  const shopEmail = storedSession?.email;
  console.log(`UNINSTALL LOG: Found stored email for ${shop}: ${shopEmail || 'NONE'}`);

  try {
    // Trigger goodbye notification to the merchant
    if (shopEmail) {
      console.log(`UNINSTALL LOG: Attempting to send goodbye email to ${shopEmail}`);
      await sendGoodbyeEmail({ 
        shopDomain: shop,
        email: shopEmail
      });
    } else {
      console.log(`UNINSTALL LOG: Skipping goodbye email - NO EMAIL in DB for ${shop}`);
    }

    // Trigger alert to admin with merchant details
    console.log(`UNINSTALL LOG: Sending admin alert for ${shop}`);
    await sendAdminUninstallNotification({
      shopDomain: shop,
      email: shopEmail,
    });
  } catch (error) {
    console.error("UNINSTALL ERROR: notification failure:", error);
  }

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
