import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "react-router";
import "@shopify/polaris/build/esm/styles.css";

export const loader = async () => {
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "a556b982b72af329f9965df4922e2761",
  };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <html lang="en">
      <head>
        <meta name="shopify-api-key" content={apiKey} />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
