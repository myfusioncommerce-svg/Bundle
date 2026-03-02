import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendGoodbyeEmail, sendAdminUninstallNotification } from "../utils/email.server";

export const action = async ({ request }) => {
  const { shop, session, topic, admin } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Fetch shop email from the database directly by shop name
  console.log(`UNINSTALL LOG: Searching DB for shop: ${shop}`);
  const storedSession = await db.session.findFirst({
    where: { shop, email: { not: null } },
    orderBy: { id: 'desc' }
  });
  
  const shopEmail = storedSession?.email;
  console.log(`UNINSTALL LOG: Found stored email for ${shop}: ${shopEmail || 'NONE'}`);

  try {
    // Trigger goodbye notification to the merchant
    if (shopEmail) {
      console.log(`UNINSTALL LOG: Sending goodbye email to merchant at ${shopEmail}`);
      await sendGoodbyeEmail({ 
        shopDomain: shop,
        email: shopEmail
      });
    } else {
      console.warn(`UNINSTALL LOG: No merchant email found in DB for ${shop}. Merchant goodbye email skipped.`);
    }

    // Trigger alert to admin with merchant details
    console.log(`UNINSTALL LOG: Sending admin alert for ${shop}`);
    await sendAdminUninstallNotification({
      shopDomain: shop,
      email: shopEmail,
    });
    console.log(`UNINSTALL LOG: All notifications processed for ${shop}`);
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
