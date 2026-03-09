import { useState, useEffect } from "react";
import { Outlet, useLoaderData, useRouteError, useLocation, Link } from "react-router";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { TitleBar, NavMenu } from "@shopify/app-bridge-react";
import shopify, { authenticate } from "../shopify.server";

const enTranslations = {
  Polaris: {
    ResourceList: {
      sortingLabel: "Sort by",
      defaultSortingLabel: "Default",
      showing: "Showing {itemsCount} {resource}",
      item: {
        viewItem: "View details for {accessibilityLabel}",
      },
    },
    Common: {
      checkbox: "checkbox",
    },
  },
};

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return { 
    apiKey: shopify.config.apiKey 
  };
};

export default function App() {
  const { apiKey } = useLoaderData();
  const location = useLocation();
  const [saveAction, setSaveAction] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    console.log("App initialized. apiKey:", apiKey);
  }, [apiKey]);

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
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <PolarisProvider i18n={enTranslations} linkComponent={Link}>
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
        <NavMenu>
          <Link to="/app" rel="home">Bundle Configuration</Link>
          <Link to="/app/product-bundle">Product Bundle</Link>
          <Link to="/app/volume-discount">Volume Discount</Link>
          <Link to="/app/bxgy">Buy X Get Y</Link>
          <Link to="/app/analytics">Analytics</Link>
          <Link to="/app/privacy-policy">Privacy Policy</Link>
          <Link to="/app/contact-us">Contact Us</Link>
          <Link to="/app/faq">FAQ</Link>
        </NavMenu>
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
  return { "Cache-Control": "no-store" };
};