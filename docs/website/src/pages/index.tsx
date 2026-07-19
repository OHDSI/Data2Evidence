import React from 'react';
import Layout from '@theme/Layout';
import styles from './d2e.module.css';
import { useEffect, useState } from 'react';
import Head from '@docusaurus/Head';


export default function D2EPage() {
  const [playVideo, setPlayVideo] = useState(false);

  const handleClick = () => {
    setPlayVideo(true);
  };
  useEffect(() => {
    document.documentElement.style.setProperty('--hero-bg', '#FFFFFF'); /*#C1D4ED*/
    return () => {
      document.documentElement.style.removeProperty('--hero-bg');
    };
  }, []);

  return (
    <Layout
      title="Data2Evidence - Unlock the power of OMOP health data with our open source platform Data2Evidence."
      description="An open source end-to-end solution for management of OMOP health data."
    >
      <Head>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://data2evidence.org/" },
            ]
          })}
        </script>
      </Head>
      <main id="content">
        {/* Hero Section */}
        <section
          className={styles.section}
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div className={`${styles.grid} ${styles.grid12}`}>
            <div
              className={styles.column}
              style={{ '--columns': 12 } as React.CSSProperties}
            >
              <div className={styles.hero}>
                <div className={styles.heroContent}>
                  {/*<img
                        className={styles.imageImg}
                        loading="lazy"
                        alt="Data2Evidence Logo"
                        src="/img/d2e2.svg"
                      />*/}
                  <h1 >Data2Evidence</h1>
                  <div className={styles.heroText}>
                    <p>
                      Let's unlock the potential of global health data - together.
                    </p>
                  </div>
                  <a href="/our-solution/" className={styles.textbutton}>
                    Learn more
                  </a>


                </div>
                <div className={styles.heroAside}>
                  <figure className={styles.image}>
                    <picture>

                      <img
                        className={styles.imageImg}
                        loading="lazy"
                        alt="Data2Evidence keyvisual"
                        src="/img/D2EGraphic.png"
                      />
                    </picture>
                  </figure>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* transforming Section */}
        <section
          className={styles.section}
          style={{ backgroundColor: '#ffffff' }}

          id="d6556857-3283-420a-b53c-3775633d2345"
        >
          <div className={`${styles.grid} ${styles.grid12}`}>
            <div
              className={styles.column}
              style={{ '--columns': 12 } as React.CSSProperties}
            >
              <center>
                <h2 className={styles.heading1}>
                  Transforming health research</h2></center>
              <div style={{ height: '2rem' }} />

              <div className={styles.d2econtent2}>
                <div className={styles.videoWrapper}>
                  {playVideo ? (
                    <figure className={styles.video}>
                      <video controls preload="metadata" autoPlay>
                        <source src="https://www.data4life.care/media/pages/our-solutions/data2evidence/5519a3b357-1752757767/543-001_data2evidence_v2_ut_eng-1080p.mp4" type="video/mp4" />
                        <a href="https://www.data4life.care/media/pages/our-solutions/data2evidence/5519a3b357-1752757767/543-001_data2evidence_v2_ut_eng-1080p.mp4">
                          <img src="/img/videop.png" alt="Data2Evidence Video"
                            style={{ cursor: 'pointer', width: '100%', height: 'auto', borderRadius: '20px' }}
                          />
                        </a>
                      </video>
                    </figure>
                  ) : (
                    <div
                      className={styles.videoContainer}
                      onClick={handleClick}
                      style={{ position: 'relative', cursor: 'pointer' }}
                    >
                      <img
                        src="/img/videop.png"  // replace with your poster image
                        alt="Data2Evidence Video"
                        onClick={handleClick}
                        style={{ cursor: 'pointer', width: '100%', height: 'auto', borderRadius: '20px' }}
                      />
                      <div className={styles.playButtonOverlay}>
                        <svg width="60" height="60" viewBox="0 0 60 60">
                          <circle cx="30" cy="30" r="30" fill="rgba(0,0,0,0.5)" />
                          <polygon points="25,20 25,40 40,30" fill="#fff" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.heroText}>
                  <p>
                    Data2Evidence bridges the gap between clinical data and cutting-edge research.
                    Our platform provides seamless access to high-quality, interoperable datasets,
                    empowering researchers to drive groundbreaking discoveries in evidence-based and personalized medicine.
                    Let's unlock the potential of global health data-together.
                  </p>
                  <p>
                    Sign up for a publicly available Data2Evidence demo.
                  </p>
                  <a href="/contact#demo" className={styles.textbutton}>
                    Book a demo
                  </a>
                  <br /><br />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className={styles.section}>
          <div className={`${styles.grid} ${styles.grid12}`}>
            <div
              className={styles.column}
              style={{ '--columns': 12 } as React.CSSProperties}
            >
              <center>
                <h2 className={styles.heading2}>Benefits of Data2Evidence at a glance</h2>
              </center>
              <div className={`${styles.features} ${styles.featuresCards}`}>

                {/* Feature 1 */}
                <div className={styles.featuresFeature}>
                  <div className={styles.featuresContent}>
                    <h4 className={styles.featuresTitle}>
                      <strong>
                        Unlock the power of OMOP health data
                      </strong>
                    </h4>
                    <p>
                      Leverage the OMOP Common Data Model to standardize, integrate, and scale your healthcare data for high-impact research.
                    </p>
                  </div>
                </div>
                {/* Feature 2 */}
                <div className={styles.featuresFeature}>
                  <div className={styles.featuresContent}>
                    <h4 className={styles.featuresTitle}>
                      <strong>Ensure high-quality & reliable data</strong>
                    </h4>
                    <p>
                      Guarantee robust, trustworthy datasets with integrated quality controls.
                    </p>
                  </div>
                </div>
                {/* Feature 3 */}
                <div className={styles.featuresFeature}>
                  <div className={styles.featuresContent}>
                    <h4 className={styles.featuresTitle}>
                      <strong>Optimize access & governance</strong>
                    </h4>
                    <p>
                      Manage data securely and efficiently with robust governance tools.
                    </p>
                  </div>
                </div>
                {/* Feature 4 */}
                <div className={styles.featuresFeature}>
                  <div className={styles.featuresContent}>
                    <h4 className={styles.featuresTitle}>
                      <strong>Empower researchers with intuitive & collaborative tools</strong>
                    </h4>
                    <p>
                      Equip researchers with powerful, user-friendly tools to accelerate insights.
                    </p>
                  </div>
                </div>
                {/* Feature 5 */}
                <div className={styles.featuresFeature}>
                  <div className={styles.featuresContent}>
                    <h4 className={styles.featuresTitle}>
                      <strong>Deploy with flexibility & security</strong>
                    </h4>
                    <p>
                      Choose the deployment model that best fits your infrastructure and compliance needs.
                    </p>
                  </div>
                </div>
                {/* Feature 6 */}
                <div className={styles.featuresFeature}>
                  <div className={styles.featuresContent}>
                    <h4 className={styles.featuresTitle}>
                      <strong>Potential use cases </strong>
                    </h4>
                    <p>
                      Enable large-scale observational studies, comparative effectiveness research, pharmacoepidemiology & pharmacovigilance, public health and policy research.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Open source community */}
        < section
          className={`${styles.section} ${styles.sectionCard}`
          }
          id="661dd069-4497-42ea-8262-f4ea659c2b95"
        >
          <div className={`${styles.grid} ${styles.grid12}`}>
            <div
              className={styles.column}
              style={{ "--columns": 12 } as React.CSSProperties}
            >
              <div className={styles.heroContent}>
                <h2
                  className={styles.heading1}
                  style={{ textAlign: "center" }}
                >
                  Data2Evidence is open source
                </h2>
                <div
                  className={styles.heroText}
                  style={{ textAlign: "center" }}
                >
                  Transparent and trustworthy. <br />
                  Avoid vendor lock-in and ensure long-term sustainability. <br />
                  Ensure collaboration through open source technology.
                </div>
              </div>
              <center>
                <a href="https://github.com/ohdsi/data2evidence" target="_blank" className={styles.texticonbutton2} > GitHub
                  <img loading="lazy" src='/img/GitHub.png' alt='Go to GitHub' className={styles.iconbutton} />
                </a>
                <a href="https://www.npmjs.com/package/d2e" target="_blank" className={styles.texticonbutton2}> npm
                  <img loading="lazy" src='/img/npm.png' alt='Go to npm' className={styles.iconbutton} />
                </a>
                <a href="https://join.slack.com/t/data2evidence/shared_invite/zt-3vabnh2qr-vMev2VfLI2Sl1YA27gGVig" target="_blank" className={styles.texticonbutton2}> Slack
                </a>
              </center>
              { /*} <center>
                <a
                  className={styles.textbutton}
                  href="/about-us"
                  rel="noopener noreferrer"
                >
                  Contact Us
                </a>
              </center> */}
            </div>
          </div>
        </section >
      </main >
    </Layout >
  );
}
