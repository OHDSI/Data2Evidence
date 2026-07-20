import React, { useEffect } from "react";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import { AboutUsPageContent } from "./about-us"
import "./about-us/module.scss"; // Ensure your SCSS includes the provided styles

export default function CompanyPage() {
  useEffect(() => {
    document.documentElement.style.setProperty("--hero-bg", "#ebf2fb");
    return () => {
      document.documentElement.style.removeProperty("--hero-bg");
    };
  }, []);

  return (
    <Layout
      title="Digital health company | Data4Life"
      description="Our solution Data2Evidence support medical research and data analysis."
    >
      <Head>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://data2evidence.org/" },
              { "@type": "ListItem", "position": 2, "name": "Data4Life", "item": "https://data2evidence.org/d4l/" }
            ]
          })}
        </script>
      </Head>
      <AboutUsPageContent />
    </Layout>
  );
}
