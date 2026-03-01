import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendGoodbyeEmail, sendAdminUninstallNotification } from "../utils/email.server";

export const action = async ({ request }) => {
  const { shop, session, topic, admin } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Fetch shop email from the database before the session is deleted
  // We cannot use GraphQL because the token is revoked during uninstallation
  let shopEmail = session?.email;
  
  if (!shopEmail && session) {
      // Fallback: try to find any existing session for this shop with an email
      const lastSession = await db.session.findFirst({
          where: { shop, email: { not: null } },
          orderBy: { expires: 'desc' }
      });
      shopEmail = lastSession?.email;
  }

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
