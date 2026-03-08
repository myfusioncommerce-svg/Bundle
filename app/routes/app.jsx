import { useState, useEffect } from "react";
import { Outlet, useLoaderData, useRouteError, useLocation, Link, redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import shopify from "../shopify.server";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";

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

import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);

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
    if (apiKey && host) {
      setIsClient(true);
    }
  }, [apiKey, host]);

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
      <PolarisProvider i18n={enTranslations} linkComponent={Link}>
        <TitleBar title={currentTitle}>
          {isClient && saveAction && (
            <button 
              variant="primary" 
              onClick={saveAction}
              disabled={isSaving}
            >
              Save Configuration
            </button>
          )}
        </TitleBar>
        {isClient && (
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