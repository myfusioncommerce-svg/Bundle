import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import db from "./db.server";
import { sendWelcomeEmail, sendAdminInstallNotification } from "./utils/email.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(db),
  distribution: AppDistribution.AppStore,
  hooks: {
    afterAuth: async ({ session, admin }) => {
      console.log(`AFTERAUTH: Starting for shop ${session.shop}`);
      shopify.registerWebhooks({ session });

      try {
        // Fetch shop details to get the contact email
        console.log(`AFTERAUTH: Fetching shop details for ${session.shop}`);
        const response = await admin.graphql(`
          #graphql
          query getShopDetails {
            shop {
              email
              contactEmail
            }
          }
        `);
        const payload = await response.json();
        console.log(`AFTERAUTH: Shop details payload received`);
        const shopEmail = payload?.data?.shop?.contactEmail || payload?.data?.shop?.email || "";
        
        // Save the shop email to the session for later use (like uninstallation)
        console.log(`AFTERAUTH: Updating session ${session.id} with email ${shopEmail}`);
        await db.session.update({
          where: { id: session.id },
          data: { email: shopEmail }
        });

        // Check if welcome email was already sent for this shop using the persistent Shop model
        console.log(`AFTERAUTH: Checking persistent Shop record for domain: ${session.shop}`);
        const shopRecord = await db.shop.findUnique({
          where: { shop: session.shop }
        });

        console.log(`AFTERAUTH: Found shopRecord: ${JSON.stringify(shopRecord)}`);

        if (!shopRecord || !shopRecord.welcomeEmailSent) {
          console.log(`AFTERAUTH: Welcome trigger criteria met (no record or not sent).`);
          console.log(`AFTERAUTH: Sending welcome email to ${shopEmail}`);
          await sendWelcomeEmail({
            shopDomain: session.shop,
            email: shopEmail
          });

          // Trigger admin notification for new installation
          console.log(`AFTERAUTH: Sending admin installation alert for ${session.shop}`);
          await sendAdminInstallNotification({
            shopDomain: session.shop,
            email: shopEmail
          });

          // Create or update the persistent Shop record to mark as welcomed
          console.log(`AFTERAUTH: UPSERTING shop record for ${session.shop} with welcomeEmailSent: true`);
          const upserted = await db.shop.upsert({
            where: { shop: session.shop },
            update: { 
              welcomeEmailSent: true,
              email: shopEmail
            },
            create: {
              shop: session.shop,
              email: shopEmail,
              welcomeEmailSent: true
            }
          });
          console.log(`AFTERAUTH: Upserted shop record: ${JSON.stringify(upserted)}`);
        } else {
          console.log(`AFTERAUTH: Welcome email already sent for ${session.shop} (welcomeEmailSent is true in Shop model). Skipping.`);
        }
        console.log(`AFTERAUTH: Successfully completed for ${session.shop}`);
      } catch (error) {
        console.error("CRITICAL ERROR in afterAuth hook:", error);
      }
    },
  },
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
