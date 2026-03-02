import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import db from "./db.server";
import { sendWelcomeEmail } from "./utils/email.server";

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

        // Check if welcome email was already sent for this shop
        console.log(`AFTERAUTH: Checking if welcome email already sent for ${session.shop}`);
        const welcomeEmailAlreadySent = await db.session.findFirst({
          where: { 
            shop: session.shop,
            welcomeEmailSent: true
          }
        });

        if (!welcomeEmailAlreadySent) {
          console.log(`AFTERAUTH: Sending welcome email to ${shopEmail}`);
          await sendWelcomeEmail({
            shopDomain: session.shop,
            email: shopEmail
          });

          // Mark this session (and thus this shop) as having received the welcome email
          console.log(`AFTERAUTH: Marking welcome email as sent in DB for session ${session.id}`);
          await db.session.update({
            where: { id: session.id },
            data: { welcomeEmailSent: true }
          });
        } else {
          console.log(`AFTERAUTH: Welcome email already sent for ${session.shop}, skipping.`);
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
