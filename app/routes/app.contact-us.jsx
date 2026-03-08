import { useEffect, useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { 
  Page, 
  Layout, 
  Card, 
  Text, 
  BlockStack, 
  TextField, 
  Button, 
  Select, 
  Box 
} from "@shopify/polaris";

export const action = async ({ request }) => {
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  console.log("Contact Form Submission:", data);

  // In a real app, you would send this to an email service or database
  return { success: true };
};

export default function ContactUs() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const shopify = useAppBridge();
  const isSubmitting = navigation.state === "submitting";
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show("Message sent successfully!");
    }
  }, [actionData, shopify]);

  const [formState, setFormState] = useState({
    name: "",
    email: "",
    countryCode: "+1",
    phone: "",
    subject: "",
    message: ""
  });

  const handleFieldChange = (field) => (value) => {
    setFormState({ ...formState, [field]: value });
  };

  if (!isClient) return null;

  return (
    <Page title="Contact Us">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Send us a Message</Text>
              <Form method="post">
                <BlockStack gap="400">
                  <TextField
                    label="Name"
                    name="name"
                    value={formState.name}
                    onChange={handleFieldChange("name")}
                    autoComplete="name"
                    requiredIndicator
                  />
                  <TextField
                    label="Email"
                    name="email"
                    type="email"
                    value={formState.email}
                    onChange={handleFieldChange("email")}
                    autoComplete="email"
                    requiredIndicator
                  />
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">Phone Number</Text>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ width: '120px' }}>
                        <Select
                          label="Country Code"
                          labelHidden
                          name="countryCode"
                          options={[
                            { label: "+1 (US/CA)", value: "+1" },
                            { label: "+44 (UK)", value: "+44" },
                            { label: "+91 (IN)", value: "+91" },
                            { label: "+61 (AU)", value: "+61" },
                            { label: "+49 (DE)", value: "+49" },
                            { label: "+33 (FR)", value: "+33" },
                            { label: "+81 (JP)", value: "+81" }
                          ]}
                          value={formState.countryCode}
                          onChange={handleFieldChange("countryCode")}
                        />
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <TextField
                          label="Phone"
                          labelHidden
                          name="phone"
                          type="tel"
                          value={formState.phone}
                          onChange={handleFieldChange("phone")}
                          autoComplete="tel"
                          requiredIndicator
                        />
                      </div>
                    </div>
                  </BlockStack>
                  <TextField
                    label="Subject"
                    name="subject"
                    value={formState.subject}
                    onChange={handleFieldChange("subject")}
                    autoComplete="off"
                    requiredIndicator
                  />
                  <TextField
                    label="Message"
                    name="message"
                    value={formState.message}
                    onChange={handleFieldChange("message")}
                    multiline={5}
                    autoComplete="off"
                    requiredIndicator
                  />
                  <Box paddingBlockStart="200">
                    <Button 
                      variant="primary" 
                      submit 
                      loading={isSubmitting}
                    >
                      Send Message
                    </Button>
                  </Box>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Other Ways to Reach Us</Text>
              <BlockStack gap="200">
                <Text as="p">
                  <strong>Email:</strong> support@bundlebuilder.com
                </Text>
                <Text as="p">
                  <strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM EST
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}