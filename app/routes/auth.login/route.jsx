import { Page, Card, TextField, Button, BlockStack, Text, Layout } from "@shopify/polaris";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState, useCallback } from "react";
import { Form, useActionData, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }) => {
  try {
    const result = await login(request);
    console.log("Login attempt result:", result);
    return { errors: loginErrorMessage(result) };
  } catch (error) {
    console.error("LOGIN ACTION ERROR:", error);
    return { errors: { shop: "Login process failed. Check server logs." } };
  }
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData || { errors: {} };

  const handleShopChange = useCallback((value) => setShop(value), []);

  return (
    <AppProvider embedded={false}>
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <Form method="post">
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Log in</Text>
                  <TextField
                    name="shop"
                    label="Shop domain"
                    helpText="example.myshopify.com"
                    value={shop}
                    onChange={handleShopChange}
                    autoComplete="on"
                    error={errors?.shop}
                  />
                  <Button submit variant="primary">Log in</Button>
                </BlockStack>
              </Form>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
