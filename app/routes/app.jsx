import { useState, useEffect } from "react";
import { Outlet, useLoaderData, useRouteError, useLocation, Link } from "react-router";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { TitleBar, NavMenu } from "@shopify/app-bridge-react";
import { authenticate, addDocumentResponseHeaders } from "../shopify.server";

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
  try {
    const { session } = await authenticate.admin(request);
    const url = new URL(request.url);
    const host = url.searchParams.get("host") || "";
    const apiKey = process.env.SHOPIFY_API_KEY || "";

    if (!apiKey) {
      console.warn("App loader warning: SHOPIFY_API_KEY is missing from process.env");
    }

    console.log("App loader success:", { 
      shop: session?.shop, 
      host: host ? "present" : "missing",
      apiKey: apiKey ? "present" : "missing"
    });

    const responseData = { 
      apiKey,
      host
    };

    const response = new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

    await addDocumentResponseHeaders(request, response.headers);

    return response;
  } catch (error) {
    console.error("App loader error details:", {
      message: error?.message,
      stack: error?.stack,
      url: request.url
    });
    
    // If it's a redirect response (302), just re-throw it so the router handles it
    if (error instanceof Response && error.status >= 300 && error.status < 400) {
      throw error;
    }
    
    throw new Response(
      JSON.stringify({ 
        message: error?.message || "Internal Server Error",
        details: "Check server logs for more information."
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export default function App() {
  const { apiKey, host } = useLoaderData();
  const location = useLocation();
  const [saveAction, setSaveAction] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    console.log("App Component Hydrated. API Key present:", !!apiKey, "Host present:", !!host);
  }, [apiKey, host]);

  if (isClient && !window.shopify) {
    console.warn("window.shopify not found - possibly not embedded or App Bridge script failed to load");
  }

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
    <PolarisProvider i18n={enTranslations} linkComponent={Link}>
      <AppProvider isEmbeddedApp apiKey={apiKey} host={host}>
        {isClient && window.shopify ? (
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
            <NavMenu>
              <Link to="/app" rel="home">Bundle Configuration</Link>
              <Link to="/app/product-bundle">Product Bundle</Link>
              <Link to="/app/volume-discount">Volume Discount</Link>
              <Link to="/app/bxgy">Buy X Get Y</Link>
              {/* <Link to="/app/analytics">Analytics</Link> */}
              <Link to="/app/privacy-policy">Privacy Policy</Link>
              <Link to="/app/contact-us">Contact Us</Link>
              <Link to="/app/faq">FAQ</Link>
            </NavMenu>
            <div style={{ padding: '20px' }}>
              <Outlet context={{ setSaveAction, setIsSaving }} />
            </div>
          </>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p>Initializing App Bridge...</p>
          </div>
        )}
      </AppProvider>
    </PolarisProvider>
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
