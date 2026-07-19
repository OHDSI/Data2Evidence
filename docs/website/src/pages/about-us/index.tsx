import React, { useEffect } from "react";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import authors from '@site/knowledge/authors.yml';
import "./module.scss"; // Ensure your SCSS includes the provided styles

export default function AboutUsPage() {
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
              { "@type": "ListItem", "position": 2, "name": "About us", "item": "https://data2evidence.org/about-us/" }
            ]
          })}
        </script>
      </Head>
      <AboutUsPageContent />
    </Layout>
  );
}

const Author = (key, author) => {
  return (
    <div
      key={key}
      className="column"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      <figure style={{ margin: 0 }}>
        <a
          href={author.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src={author.image_url}
            alt={author.name}
            style={{
              width: '40px',
              borderRadius: '50%',
            }}
          />
        </a>
      </figure>
      <div>
        <h4 style={{ margin: '0 0 0.25rem' }}>
          <a
            href={author.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {author.name}
          </a>
          {author.socials?.github && (
            <a
              href={`https://github.com/${author.socials.github}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: '0.5rem' }}

            >
              <img
                src="/img/github.svg"
                alt="GitHub"
                style={{ width: '15px', height: '15px' }}
              />
            </a>
          )}
          {author.socials?.linkedin && (
            <a
              href={`https://linkedin.com/in/${author.socials.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: '0.5rem' }}

            >
              <img
                src="/img/linkedin.svg"
                alt="LinkedIn"
                style={{ width: '15px', height: '15px' }}
              />
            </a>
          )}
        </h4>
        {/* <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}>{author.title}</p> */}
      </div>
    </div>
  );
}

const AuthorTitle = (key, author) => {
  return (
    <div
      key={key}
      className="column"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      <figure style={{ margin: 0 }}>
        <a
          href={author.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src={author.image_url}
            alt={author.name}
            style={{
              width: '40px',
              borderRadius: '50%',
            }}
          />
        </a>
      </figure>
      <div>
        <h4 style={{ margin: '0 0 0.25rem' }}>
          <a
            href={author.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {author.name}
          </a>
          {author.socials?.github && (
            <a
              href={`https://github.com/${author.socials.github}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: '0.5rem' }}

            >
              <img
                src="/img/github.svg"
                alt="GitHub"
                style={{ width: '15px', height: '15px' }}
              />
            </a>
          )}
          {author.socials?.linkedin && (
            <a
              href={`https://linkedin.com/in/${author.socials.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: '0.5rem' }}

            >
              <img
                src="/img/linkedin.svg"
                alt="LinkedIn"
                style={{ width: '15px', height: '15px' }}
              />
            </a>
          )}
        </h4>
        {<p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}>{author.title}</p>}
      </div>
    </div>
  );
}

export const AboutUsPageContent = () => {
  return (
    <main id="content" className="about-us">
      {/* Breadcrumbs and hero section */}
      <section style={{ backgroundColor: "#ebf2fb" }}>
        <div className="grid">
          <div className="hero grid--2">
            <div className="hero__content">
              <h1 className="hero__headline">
                Singapore's thriving health tech industry
              </h1>
              <div className="hero__text">
                <p>
                  Data4Life Asia is located at the center of innovation in a
                  rapidly growing market for digital health.
                </p>
              </div>
            </div>
            <div className="hero__aside">
              <figure className="image">
                <picture>
                  <source
                    type="image/webp"
                    width="403"
                    height="340"
                    srcSet="/img/about-us/210521-asia-hero-image-company-403x.webp 1x, /img/about-us/210521-asia-hero-image-company.webp 2x"
                  />
                  <img
                    className="image__img"
                    loading="lazy"
                    alt="Singapore skyline view"
                    src="/img/about-us/210521_asia_hero_image_company.jpg"
                    width="403"
                    height="340"
                    srcSet="/img/about-us/210521-asia-hero-image-company-403x.jpg 1x, /img/about-us/210521_asia_hero_image_company.jpg 2x"
                  />
                </picture>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* Company introduction and hints */}
      <section
        id="ac4b751d-8b59-4c31-9d44-eaf1d2c12d79"
        className="section section--narrow"
        style={{ paddingLeft: 0, paddingRight: 0 }}
      >
        <div className="grid grid--2">
          <div className="column">
            <p>
              Data4Life Asia is a digital health company headquartered in
              Singapore. Our digital solutions support medical research and
              data analysis, providing greater access to user-generated health
              data.
            </p>
            <p>
              Data4Life Asia is an industry member of the Singapore Health
              Technologies Consortium (HealthTEC).
            </p>
          </div>
          <div className="column">
            <div className="hints">
              <ul className="hints__list">
                <li className="hints__item">
                  <img
                    className="hints__figure"
                    src="/img/about-us/1-healthdata.svg"
                    alt="Better access to health data"
                    role="presentation"
                  />
                  <span>Better access to health data</span>
                </li>
                <li className="hints__item">
                  <img
                    className="hints__figure"
                    src="/img/about-us/2-interoperability.svg"
                    alt="Increased interoperability"
                    role="presentation"
                  />
                  <span>Increased interoperability</span>
                </li>
                <li className="hints__item">
                  <img
                    className="hints__figure"
                    src="/img/about-us/2-secureethical.svg"
                    alt="Secure and ethical solutions"
                    role="presentation"
                  />
                  <span>Secure &amp; ethical solutions</span>
                </li>
                <li className="hints__item">
                  <img
                    className="hints__figure"
                    src="/img/about-us/4-cocreation.svg"
                    alt="Emphasis on co-creation"
                    role="presentation"
                  />
                  <span>Emphasis on co-creation</span>
                </li>
                <li className="hints__item">
                  <img
                    className="hints__figure"
                    src="/img/about-us/5-machinelearning.svg"
                    alt="Machine learning algorithms"
                    role="presentation"
                  />
                  <span>Machine learning algorithms</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* teams section */}
      <section id="team" className="section section--narrow"
        style={{ marginTop: '0rem' }} // reduced margin here
      >
        <div className="section--narrow grid" style={{ paddingTop: '0rem' }}>
          <h2>Team</h2>
          <div className="teamGrid" style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(authors).filter(([key, author]) => author.page && author.ops).map(([key, author]) => AuthorTitle(key, author))}
          </div>
          <br />
          <h3>Analyze Team</h3>
          <div className="teamGrid" style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(authors).filter(([key, author]) => author.page && author.team == "Analyze").map(([key, author]) => Author(key, author))}
          </div>
          <br />
          <h3>Data Team</h3>
          <div className="teamGrid" style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(authors).filter(([key, author]) => author.page && author.team == "Data").map(([key, author]) => Author(key, author))}
          </div>
          <br />
          <h3>Integrate Team</h3>
          <div className="teamGrid" style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(authors).filter(([key, author]) => author.page && author.team == "Integrate").map(([key, author]) => Author(key, author))}
          </div>
          <br />
          <h3>Jobs</h3>
          <p>
            You can find our current open positions <a href="/jobs/"><strong>here</strong></a>.
          </p>
        </div>
      </section>


      {/* Vision section */}
      <section
        id="a0e1eaae-284f-48f0-aa9e-d93752df9254"
        className="section section--card"
        style={{ backgroundColor: "#f2f0f1" }}
      >
        <div className="grid grid--2">
          <div>
            <h2>Vision</h2>
            <p>
              At Data4Life Asia, we believe developing data-driven solutions
              for medical research will have a significant impact on
              healthcare.
            </p>
            <p>
              We aim to make data donation more secure and accessible for the
              general public while also standardizing datasets for enhanced
              analytics. By supporting medical research, our digital solutions
              can lead to beneficial new insights.
            </p>
          </div>
          <div>
            <figure className="image">
              <picture>
                <source
                  type="image/webp"
                  width="417"
                  height="274.5"
                  srcSet="/img/about-us/company-vision-417x.webp 1x, /img/about-us/company-vision.webp 2x"
                />
                <img
                  className="image__img"
                  loading="lazy"
                  alt="Company vision"
                  src="/img/about-us/company_vision.jpg"
                  width="417"
                  height="274.5"
                  srcSet="/img/about-us/company-vision-417x.jpg 1x, /img/about-us/company_vision.jpg 2x"
                />
              </picture>
            </figure>
          </div>
        </div>
      </section>
      <br />

      {/* Nonprofit ties section */}
      <section
        id="f2d09c46-62ad-4a1f-94d2-b9b8b9073baa"
        className="section nonprofit"
        style={{ backgroundColor: "#faf8f8" }}
      >
        <div className="section--narrow">
          {" "}
          <div className="grid grid--8">
            <div
              className="column"
              style={{ "--columns": 8 } as React.CSSProperties}
            >
              <h2>Ties to the nonprofit organization</h2>
              <p>
                Data4Life is a nonprofit digital health organization. In addition to Data4Life Asia in
                Singapore, our diverse team is working to improve global
                health at three other locations in Berlin, and Potsdam.
              </p>
              <p>
                Data4Life was founded in 2017, originating as a research
                project at the Hasso Plattner Institute and funded by the
                Hasso Plattner Foundation. As a nonprofit company, Data4Life
                has the unique opportunity to work together with partners who
                share our vision, offering expertise and resources in pursuit
                of a healthier future.
              </p>
              <p>
                We want to make a meaningful contribution to healthcare by
                integrating technology, data, and science.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }}>
                <div>
                  <p>
                    <small>An initiative by</small>
                  </p>
                  <a href="https://data4life.care/" target="_blank">
                    <img
                      alt="Part of Data4Life"
                      src="/img/d4l_logo.svg"
                      width={140} />
                  </a>
                </div>
                <div>
                  <p>
                    <small>&nbsp;</small>
                  </p>
                  <img
                    alt="An initiative by the Hasso Plattner Foundation"
                    src="/img/logohpf.svg"
                    width={300}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}