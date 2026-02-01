import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`Received ${topic} compliance webhook for ${shop}`);

    // According to Shopify's documentation, these webhooks should be handled
    // and acknowledged with a 200 OK response.
    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST":
      case "CUSTOMERS_REDACT":
      case "SHOP_REDACT":
        console.log(JSON.stringify(payload, null, 2));
        return new Response();
      default:
        return new Response("Unhandled topic", { status: 404 });
    }
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
