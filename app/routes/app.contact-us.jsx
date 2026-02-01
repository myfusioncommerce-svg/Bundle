import { useEffect } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

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

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show("Message sent successfully!");
    }
  }, [actionData, shopify]);

  return (
    <s-page heading="Contact Us">
      <s-section heading="Send us a Message">
        <Form method="post">
          <s-stack direction="block" gap="base">
            <div>
              <s-text>Name</s-text>
              <input 
                name="name" 
                placeholder="Your Name" 
                required 
                style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} 
              />
            </div>
            <div>
              <s-text>Email</s-text>
              <input 
                name="email" 
                type="email" 
                placeholder="your@email.com" 
                required 
                style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} 
              />
            </div>
            <div>
              <s-text>Phone Number</s-text>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <select 
                  name="countryCode" 
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white' }}
                >
                  <option value="+1">+1 (US/CA)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+91">+91 (IN)</option>
                  <option value="+61">+61 (AU)</option>
                  <option value="+49">+49 (DE)</option>
                  <option value="+33">+33 (FR)</option>
                  <option value="+81">+81 (JP)</option>
                </select>
                <input 
                  name="phone" 
                  type="tel" 
                  placeholder="123 456 7890" 
                  required 
                  style={{ flexGrow: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                />
              </div>
            </div>
            <div>
              <s-text>Subject</s-text>
              <input 
                name="subject" 
                placeholder="How can we help?" 
                required 
                style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} 
              />
            </div>
            <div>
              <s-text>Message</s-text>
              <textarea 
                name="message" 
                placeholder="Write your message here..." 
                required 
                rows="5"
                style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }} 
              />
            </div>
            <s-button 
              variant="primary" 
              type="submit" 
              loading={isSubmitting ? "true" : undefined}
            >
              Send Message
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="Other Ways to Reach Us">
        <s-paragraph>
          <strong>Email:</strong> support@bundlebuilder.com
        </s-paragraph>
        <s-paragraph>
          <strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM EST
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
