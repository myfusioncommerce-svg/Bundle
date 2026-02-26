import { useState } from "react";
import { Outlet, useLoaderData, useRouteError, useLocation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const url = new URL(request.url);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    host: url.searchParams.get("host") || "",
  };
};

export const meta = ({ data }) => {
  return [
    { name: "shopify-api-key", content: data?.apiKey },
    { name: "shopify-host", content: data?.host },
  ];
};

export default function App() {
  const { apiKey, host } = useLoaderData();
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
    <AppProvider apiKey={apiKey} host={host}>
      <s-app-nav>
        <s-link href="/app">Bundle Configuration</s-link>
        {/* <s-link href="/app/product-bundle">Product Bundle</s-link>
        <s-link href="/app/volume-discount">Volume Discount</s-link>
        <s-link href="/app/bxgy">Buy X Get Y</s-link> */}
        <s-link href="/app/privacy-policy">Privacy Policy</s-link>
        <s-link href="/app/contact-us">Contact Us</s-link>
        <s-link href="/app/faq">FAQ</s-link>
      </s-app-nav>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        backgroundColor: '#f6f6f7',
        borderBottom: '1px solid #e1e3e5',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <h1 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#303030' }}>{currentTitle}</h1>
        {saveAction && (
          <s-button 
            variant="primary" 
            onClick={() => {
              if (typeof saveAction === 'function') {
                saveAction();
              }
            }}
            loading={isSaving ? "true" : undefined}
          >
            Save Configuration
          </s-button>
        )}
      </div>

      <div style={{ padding: '20px' }}>
        <Outlet context={{ setSaveAction, setIsSaving }} />
      </div>
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
