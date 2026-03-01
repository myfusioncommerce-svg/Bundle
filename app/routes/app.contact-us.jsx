import { 
  Box, 
  Card, 
  Layout, 
  Page, 
  Text, 
  BlockStack, 
  InlineStack, 
  TextField, 
  Button, 
  Icon, 
  Link, 
  Divider, 
} from "@shopify/polaris"; 
import { TitleBar } from "@shopify/app-bridge-react"; 
import { EmailIcon } from "@shopify/polaris-icons"; 
import { useEffect, useState } from "react"; 
import { useLoaderData, useActionData, useNavigation, Form } from "react-router"; 
import { authenticate } from "../shopify.server"; 
import { sendContactEmails } from "../utils/email.server"; 

export const loader = async ({ request }) => { 
  const { admin, session } = await authenticate.admin(request); 
 
  try { 
    // Query the shop's primary contact email 
    const response = await admin.graphql( 
      `#graphql 
      query ShopContactEmail { 
        shop { 
          email 
          contactEmail 
        } 
      } 
    ` 
    ); 
 
    const payload = await response.json(); 
    const graphqlErrors = payload?.errors?.length ? payload.errors : payload?.data?.errors; 
    if (graphqlErrors?.length) { 
      graphqlErrors.forEach((err) => console.error("GraphQL error fetching store email:", err)); 
    } 
 
    const fallbackEmail = "support@zoww.app"; 
    const ownerEmail = 
      payload?.data?.shop?.email || payload?.data?.shop?.contactEmail || null; 
 
    return { 
      ownerEmail: ownerEmail ?? fallbackEmail, 
      errors: graphqlErrors ?? [], 
      myshopifyDomain: session?.shop ?? null, 
    }; 
  } catch (error) { 
    console.error("Failed to fetch store email:", error); 
    return { 
      ownerEmail: null, 
      errors: [{ message: error?.message || "An error occurred while loading the contact page" }], 
      myshopifyDomain: session?.shop ?? null, 
    }; 
  } 
}; 
 
export const action = async ({ request }) => { 
  const { admin } = await authenticate.admin(request);

  if (request.method !== "POST") { 
    return { success: false, message: "Method not allowed" }; 
  } 
 
  const formData = await request.formData(); 
  const name = formData.get("name"); 
  const email = formData.get("email"); 
  const message = formData.get("message"); 
  const myshopifyDomain = formData.get("myshopifyDomain"); 
 
  if (!name || !email || !message || !myshopifyDomain) { 
    return { 
        success: false, 
        message: "Missing required fields. Please check your inputs and try again.", 
    }; 
  } 
 
  try { 
    console.log("ACTION: Starting email send with:", { name, email, myshopifyDomain: myshopifyDomain?.substring(0, 20) }); 
     
    const result = await sendContactEmails({ 
      customerName: name, 
      customerEmail: email, 
      message, 
      shopDomain: myshopifyDomain, 
    }); 
 
    console.log("ACTION: Contact emails sent successfully:", result); 
 
    return { 
      success: true, 
      message: result.message, 
    }; 
  } catch (error) { 
    console.error("ACTION ERROR - Error sending contact emails:", error); 
     
    let errorMessage = "An unexpected error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else {
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        errorMessage = "An unserializable error occurred";
      }
    }

    return { 
        success: false, 
        message: `Error: ${errorMessage}`, 
    }; 
  } 
}; 
 
export default function ContactPage() { 
  const loaderData = useLoaderData(); 
  const actionData = useActionData();
  const navigation = useNavigation();
  const ownerEmail = loaderData?.ownerEmail ?? null; 
  const loaderErrors = loaderData?.errors ?? []; 
  const myshopifyDomain = loaderData?.myshopifyDomain ?? ""; 
  const [name, setName] = useState(""); 
  const [email, setEmail] = useState(""); 
  const [emailError, setEmailError] = useState(""); 
  const [message, setMessage] = useState(""); 
  const [responseMessage, setResponseMessage] = useState(null); 
  const [isSuccess, setIsSuccess] = useState(false); 
  const isLoading = navigation.state === "submitting";
 
  useEffect(() => { 
    if (loaderErrors.length) { 
      loaderErrors.forEach((error) => console.error("Loader error", error)); 
    } 
  }, [loaderErrors]); 
 
  useEffect(() => { 
    if (actionData) {
      setResponseMessage(actionData.message || (actionData.success ? "Thank you for your message! We'll get back to you soon." : "We couldn't send your message. Please try again later."));
      setIsSuccess(actionData.success);
      if (actionData.success) {
        setName("");
        setEmail("");
        setMessage("");
      }
    }
  }, [actionData]);
 
  const handleEmailChange = (value) => { 
    setEmail(value); 
    if (value && !/^\S+@\S+\.\S+$/.test(value)) { 
      setEmailError("Please enter a valid email address"); 
    } else { 
      setEmailError(""); 
    } 
  }; 
 
  return ( 
    <Page> 
      <TitleBar title="Contact Us" /> 
      <Layout> 
        <Layout.Section> 
          <Card> 
            <BlockStack gap="400"> 
              <Text as="h2" variant="headingLg"> 
                Get in Touch 
              </Text> 
              <Text as="p" variant="bodyMd"> 
                We'd love to hear from you! Send us a message and we'll respond as soon as possible. 
              </Text> 
 
              {responseMessage && ( 
                <Box 
                  padding="400" 
                  background={isSuccess ? "bg-surface-success" : "bg-surface-critical"} 
                  borderRadius="200" 
                  borderWidth="025" 
                  borderColor={isSuccess ? "border-success" : "border-critical"} 
                > 
                  <Text as="p" variant="bodyMd" tone={isSuccess ? "success" : "critical"}> 
                    {responseMessage} 
                  </Text> 
                </Box> 
              )} 
 
              <Form method="post"> 
                <input type="hidden" name="myshopifyDomain" value={myshopifyDomain} />
                <BlockStack gap="400"> 
                  <TextField 
                    label="Your Name" 
                    name="name"
                    value={name} 
                    onChange={setName} 
                    placeholder="Enter your full name" 
                    requiredIndicator 
                    autoComplete="name" 
                  /> 
 
                  <TextField 
                    label="Your Email" 
                    name="email"
                    type="email" 
                    value={email} 
                    onChange={handleEmailChange} 
                    error={emailError} 
                    placeholder="Enter your email address" 
                    requiredIndicator 
                    autoComplete="email" 
                  /> 
 
                  <TextField 
                    label="Your Message" 
                    name="message"
                    value={message} 
                    onChange={setMessage} 
                    placeholder="Tell us how we can help you..." 
                    multiline={6} 
                    requiredIndicator 
                  /> 
 
                  <InlineStack align="end"> 
                    <Button 
                      variant="primary" 
                      submit 
                      loading={isLoading} 
                      disabled={!name || !email || !message || isLoading} 
                    > 
                      Send Message 
                    </Button> 
                  </InlineStack> 
                </BlockStack> 
              </Form> 
            </BlockStack> 
          </Card> 
        </Layout.Section> 
 
        <Layout.Section variant="oneThird"> 
          <Card> 
            <BlockStack gap="400"> 
              <Text as="h2" variant="headingMd"> 
                Contact Information 
              </Text> 
              <Text as="p" variant="bodyMd"> 
                Reach out to us through any of these channels: 
              </Text> 
 
              <Divider /> 
 
              <BlockStack gap="300"> 
                {/* Email Handle */} 
                <InlineStack gap="300" align="start"> 
                  <Box> 
                    <Icon source={EmailIcon} tone="base" /> 
                  </Box> 
                  <BlockStack gap="100"> 
                    <Text as="h3" variant="headingSm"> 
                      Email 
                    </Text> 
                    <Link 
                      url={ownerEmail ? `mailto:${ownerEmail}` : undefined} 
                      target="_blank" 
                      removeUnderline 
                    > 
                      <Text as="p" variant="bodyMd" tone="subdued"> 
                        {ownerEmail || "support@zoww.app"} 
                      </Text> 
                    </Link> 
                  </BlockStack> 
                </InlineStack> 
              </BlockStack> 
 
              <Divider /> 
 
              <Text as="p" variant="bodySm" tone="subdued"> 
                We typically respond within 24 hours during business days. 
              </Text> 
            </BlockStack> 
          </Card> 
        </Layout.Section> 
      </Layout> 
    </Page> 
  ); 
}
