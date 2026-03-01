import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendGoodbyeEmail, sendAdminUninstallNotification } from "../utils/email.server";

export const action = async ({ request }) => {
  const { shop, session, topic, admin } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Fetch shop email from the database directly by shop name
  // The session object from authenticate.webhook might not have our custom 'email' field
  const storedSession = await db.session.findFirst({
    where: { shop, email: { not: null } },
    orderBy: { id: 'desc' }
  });
  
  const shopEmail = storedSession?.email;

  try {
    // Trigger goodbye notification to the merchant
    await sendGoodbyeEmail({ 
      shopDomain: shop,
      email: shopEmail
    });

    // Trigger alert to admin with merchant details
    await sendAdminUninstallNotification({
      shopDomain: shop,
      email: shopEmail,
      // We don't have phone in the DB, so it will be null, which is fine
    });
  } catch (error) {
    console.error("Error sending uninstall notifications:", error);
  }

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
