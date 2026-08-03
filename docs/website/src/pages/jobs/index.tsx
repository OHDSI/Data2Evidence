import React from 'react';
import Layout from '@theme/Layout';
import {useLocation} from '@docusaurus/router';

export default function ContactUsPage() {

  const iframeSrc = `https://jobs.employmenthero.com/SG/organisations/data4life`;

  return (
    <Layout title="Jobs" description="Get in touch with us">
      <main id="content">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <iframe
            src={iframeSrc}
            width="900"
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
