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
      shopify.registerWebhooks({ session });

      try {
        // Fetch shop details to get the contact email
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
        const shopEmail = payload?.data?.shop?.contactEmail || payload?.data?.shop?.email;
        
        // Save the shop email to the session for later use (like uninstallation)
        await db.session.update({
          where: { id: session.id },
          data: { email: shopEmail }
        });

        await sendWelcomeEmail({
          shopDomain: session.shop,
          email: shopEmail
        });
      } catch (error) {
        console.error("Error in afterAuth hook:", error);
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
