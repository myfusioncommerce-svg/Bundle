import { useState } from "react";
import { Outlet, useLoaderData, useRouteError, useLocation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session, redirect } = await authenticate.admin(request);

  // Check for active subscriptions
  const response = await admin.graphql(`
    #graphql
    query {
      appInstallation {
        activeSubscriptions {
          id
          status
        }
      }
    }
  `);

  const responseJson = await response.json();
  const activeSubscriptions = responseJson.data?.appInstallation?.activeSubscriptions || [];

  // If no ACTIVE subscription is found, redirect to pricing plans
  const hasActivePlan = activeSubscriptions.some(sub => sub.status === "ACTIVE");

  if (!hasActivePlan) {
    const storeName = session.shop.split(".")[0];
    const pricingPlansUrl = `https://admin.shopify.com/store/${storeName}/charges/bundle-builder-84/pricing_plans`;
    
    // Use Shopify's redirect to ensure it breaks out of the iframe if needed
    return redirect(pricingPlansUrl, { target: "_top" });
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();
  const location = useLocation();
  const [saveAction, setSaveAction] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const titles = {
    "/app": "Bundle Configuration",
    "/app/product-bundle": "Product Bundle",
    "/app/volume-discount": "Volume Discount",
    "/app/bxgy": "Buy X Get Y",
    "/app/analytics": "Analytics",
    "/app/privacy-policy": "Privacy Policy",
    "/app/contact-us": "Contact Us",
    "/app/faq": "FAQ",
  };

  const currentTitle = titles[location.pathname] || "Bundle Builder";

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisProvider i18n={enTranslations}>
        <s-app-nav>
          <s-link href="/app">Bundle Configuration</s-link>
          <s-link href="/app/product-bundle">Product Bundle</s-link>
          <s-link href="/app/volume-discount">Volume Discount</s-link>
          <s-link href="/app/bxgy">Buy X Get Y</s-link>
          <s-link href="/app/analytics">Analytics</s-link>
          <s-link href="/app/privacy-policy">Privacy Policy</s-link>
          <s-link href="/app/contact-us">Contact Us</s-link>
          <s-link href="/app/faq">FAQ</s-link>
        </s-app-nav>
        
        <ui-title-bar title={currentTitle}>
          {saveAction && (
            <button
              variant="primary"
              onClick={() => {
                if (typeof saveAction === 'function') {
                  saveAction();
                }
              }}
              disabled={isSaving}
            >
              Save Configuration
            </button>
          )}
        </ui-title-bar>

        <div style={{ padding: '20px' }}>
          <Outlet context={{ setSaveAction, setIsSaving }} />
        </div>
      </PolarisProvider>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
