import { useState } from "react";
import { Form, useActionData, useLoaderData } from "react-router";
import { 
  AppProvider as PolarisProvider, 
  Page, 
  Layout, 
  Card, 
  Text, 
  BlockStack, 
  TextField, 
  Button, 
  Box 
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <PolarisProvider i18n={enTranslations}>
      <Page title="Log in">
        <Layout>
          <Layout.Section>
            <Box paddingBlockStart="1000" paddingBlockEnd="1000">
              <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                <Card>
                  <Form method="post">
                    <BlockStack gap="400">
                      <Text variant="headingLg" as="h1">Log in</Text>
                      <Text as="p">Enter your shop domain to log in to the app.</Text>
                      <TextField
                        label="Shop domain"
                        name="shop"
                        value={shop}
                        onChange={setShop}
                        autoComplete="on"
                        error={errors.shop}
                        helpText="example.myshopify.com"
                        requiredIndicator
                      />
                      <Button variant="primary" submit fullWidth>
                        Log in
                      </Button>
                    </BlockStack>
                  </Form>
                </Card>
              </div>
            </Box>
          </Layout.Section>
        </Layout>
      </Page>
    </PolarisProvider>
  );
}