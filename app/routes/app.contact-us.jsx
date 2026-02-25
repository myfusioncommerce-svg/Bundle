import { useEffect } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import nodemailer from "nodemailer";

export const action = async ({ request }) => {
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  const transporter = nodemailer.createTransport({
    host: "smtp.zeptomail.in",
    port: 587,
    auth: {
      user: "emailapikey",
      pass: "********", // Replace with your actual password
    },
  });

  const mailOptions = {
    from: '"Example Team" <noreply@fusioncommerce.online>',
    to: "myfusioncommerce@gmail.com",
    subject: `Contact Form: ${data.subject}`,
    html: `
      <h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.countryCode} ${data.phone}</p>
      <p><strong>Subject:</strong> ${data.subject}</p>
      <p><strong>Message:</strong></p>
      <p>${data.message}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: "Failed to send message." };
  }
};

export default function ContactUs() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const shopify = useAppBridge();
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show("Message sent successfully!");
    } else if (actionData?.error) {
      shopify.toast.show(actionData.error, { isError: true });
    }
  }, [actionData, shopify]);

  return (
    <s-page>
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
