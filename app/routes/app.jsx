import { useState } from "react";
import { Outlet, useLoaderData, useRouteError, useLocation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu, TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session, redirect } = await authenticate.admin(request);

  let activeSubscriptions = [];
  try {
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
    activeSubscriptions = responseJson.data?.appInstallation?.activeSubscriptions || [];
  } catch (err) {
    console.error("Error fetching subscriptions:", err);
  }

  // If no ACTIVE subscription is found, redirect to pricing plans
  const hasActivePlan = activeSubscriptions.some(sub => sub.status === "ACTIVE");

  if (!hasActivePlan && process.env.NODE_ENV === "production") {
    const storeName = session.shop.split(".")[0];
    const pricingPlansUrl = `https://admin.shopify.com/store/${storeName}/charges/fusion-upsell-bundle/pricing_plans`;
    
    // Use Shopify's redirect to ensure it breaks out of the iframe if needed
    return redirect(pricingPlansUrl, { target: "_top" });
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "a556b982b72af329f9965df4922e2761" };
};

export default function App() {
  const data = useLoaderData();
  const { apiKey } = data || { apiKey: "" };
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
    <PolarisProvider i18n={enTranslations}>
      <AppProvider isEmbedded apiKey={apiKey || "a556b982b72af329f9965df4922e2761"}>
        <NavMenu>
          <a href="/app" rel="home">Bundle Configuration</a>
          <a href="/app/product-bundle">Product Bundle</a>
          <a href="/app/volume-discount">Volume Discount</a>
          <a href="/app/bxgy">Buy X Get Y</a>
          <a href="/app/analytics">Analytics</a>
          <a href="/app/privacy-policy">Privacy Policy</a>
          <a href="/app/contact-us">Contact Us</a>
          <a href="/app/faq">FAQ</a>
        </NavMenu>
        
        <TitleBar title={currentTitle}>
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
        </TitleBar>

        <div style={{ padding: '20px' }}>
          <Outlet context={{ setSaveAction, setIsSaving }} />
        </div>
      </AppProvider>
    </PolarisProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  const error = useRouteError();
  console.error("App boundary error:", error);
  
  if (boundary.error(error)) {
    return boundary.error(error);
  }

  return (
    <PolarisProvider i18n={enTranslations}>
      <div style={{ padding: '20px' }}>
        <h2>Something went wrong</h2>
        <pre>{error.message || JSON.stringify(error, null, 2)}</pre>
      </div>
    </PolarisProvider>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
