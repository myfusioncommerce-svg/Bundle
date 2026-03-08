import { useState, useEffect } from "react";
import { Outlet, useLoaderData, useRouteError, useLocation, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);

  // Check for active subscriptions
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
    const activeSubscriptions = responseJson.data?.appInstallation?.activeSubscriptions || [];
    const hasActivePlan = activeSubscriptions.some(sub => sub.status === "ACTIVE");

    if (!hasActivePlan && session.shop !== "dev-store-749237498237499013.myshopify.com") {
      const storeName = session.shop.split(".")[0];
      const pricingPlansUrl = `https://admin.shopify.com/store/${storeName}/charges/bundle-builder-84/pricing_plans`;
      return boundary.redirect(pricingPlansUrl, { target: "_top" });
    }
  } catch (error) {
    console.error("Error checking subscriptions:", error);
  }

  return { 
    apiKey: process.env.SHOPIFY_API_KEY || "",
    host: url.searchParams.get("host") || ""
  };
};

export default function App() {
  const { apiKey, host } = useLoaderData();
  const location = useLocation();
  const [saveAction, setSaveAction] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const normalizedPath = location.pathname.replace(/\/$/, "") || "/app";
  const currentTitle = titles[normalizedPath] || "Bundle Builder";

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey} host={host}>
      <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
      <PolarisProvider i18n={enTranslations} linkComponent={Link}>
        {isClient && (
          <>
            <TitleBar title={currentTitle}>
              {saveAction && (
                <button 
                  variant="primary" 
                  onClick={saveAction}
                  disabled={isSaving}
                >
                  Save Configuration
                </button>
              )}
            </TitleBar>
            <ui-nav-menu>
              <Link to="/app" rel="home">Bundle Configuration</Link>
              <Link to="/app/product-bundle">Product Bundle</Link>
              <Link to="/app/volume-discount">Volume Discount</Link>
              <Link to="/app/bxgy">Buy X Get Y</Link>
              <Link to="/app/analytics">Analytics</Link>
              <Link to="/app/privacy-policy">Privacy Policy</Link>
              <Link to="/app/contact-us">Contact Us</Link>
              <Link to="/app/faq">FAQ</Link>
            </ui-nav-menu>
          </>
        )}
      
      <div style={{ padding: '20px' }}>
        <Outlet context={{ setSaveAction, setIsSaving }} />
      </div>
      </PolarisProvider>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <PolarisProvider i18n={enTranslations}>
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>App Error</h1>
        <p style={{ color: '#666' }}>{error?.message || "An unexpected error occurred."}</p>
      </div>
    </PolarisProvider>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};