import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import { useLocation } from '@docusaurus/router';

const GDOCS_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeAETbHVOl9B2iGuI1sF59Si19DZdrqsJdAgKe0E8TeLTBS9w/viewform?embedded=true'

export default function ContactUsPage() {
  const location = useLocation();
  const [iframeSrc, setIframeSrc] = useState(GDOCS_URL);

  useEffect(() => {
    const dynamicValue = location.hash === '#demo' ? '[DEMO_ACCESS] I would like to request access to the demo system' : location.hash === '#ohdsi' ? '[OHDSI_SIGNUP] I would like to participate in the Data2Evidence collaboration activity at the OHDSI Global Symposium' : '';
    setIframeSrc(`${GDOCS_URL}&entry.526650286=${encodeURIComponent(dynamicValue)}`);
  }, [location.hash])

  return (
    <Layout title="Contact Us | Data2Evidence" description="Data2Evidence - Unlock the power of OMOP health data with our open source platform Data2Evidence.">
      <Head>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://data2evidence.org/" },
              { "@type": "ListItem", "position": 2, "name": "Contact", "item": "https://data2evidence.org/contact/" }
            ]
          })}
        </script>
      </Head>
      <main id="content">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <iframe
            src={iframeSrc}
            width="640"
            height="900"
            frameBorder="0"
            marginHeight="0"
            marginWidth="0"
            title="Contact Form"
          >
            Loading…
          </iframe>
        </div>
      </main>
    </Layout>
  );
}
