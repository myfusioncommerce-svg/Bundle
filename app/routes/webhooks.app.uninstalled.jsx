import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendGoodbyeEmail, sendAdminUninstallNotification } from "../utils/email.server";

export const action = async ({ request }) => {
  const { shop, session, topic, admin } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    // Fetch shop details to get the contact email and phone before the session is fully gone
    const response = await admin.graphql(`
      #graphql
      query getShopDetails {
        shop {
          email
          contactEmail
          phone
        }
      }
    `);
    const payload = await response.json();
    const shopData = payload?.data?.shop;
    const shopEmail = shopData?.contactEmail || shopData?.email;
    const shopPhone = shopData?.phone;

    // Trigger goodbye notification to the merchant
    await sendGoodbyeEmail({ 
      shopDomain: shop,
      email: shopEmail
    });

    // Trigger alert to admin with merchant details
    await sendAdminUninstallNotification({
      shopDomain: shop,
      email: shopEmail,
      phone: shopPhone
    });
  } catch (error) {
    console.error("Error fetching shop details for uninstall notifications:", error);
    // Fallback to sending basic notification to admin if shop details fail
    await sendAdminUninstallNotification({ shopDomain: shop });
  }

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
