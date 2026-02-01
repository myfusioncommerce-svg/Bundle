export default function FAQ() {
  return (
    <s-page heading="Frequently Asked Questions">
      <s-section heading="General">
        <s-stack direction="block" gap="base">
          <div>
            <s-text font-weight="bold">How do I create a bundle?</s-text>
            <s-paragraph>
              Navigate to the Bundle Configuration page, select your products, and set your discount tiers.
            </s-paragraph>
          </div>
          <div>
            <s-text font-weight="bold">Where do the bundles appear?</s-text>
            <s-paragraph>
              Bundles appear on the product pages or dedicated bundle pages depending on your configuration.
            </s-paragraph>
          </div>
        </s-stack>
      </s-section>
      <s-section heading="Discounts">
        <s-stack direction="block" gap="base">
          <div>
            <s-text font-weight="bold">Can I offer percentage-based discounts?</s-text>
            <s-paragraph>
              Yes, you can configure progressive percentage discounts based on the number of items in the bundle.
            </s-paragraph>
          </div>
        </s-stack>
      </s-section>
    </s-page>
  );
}
