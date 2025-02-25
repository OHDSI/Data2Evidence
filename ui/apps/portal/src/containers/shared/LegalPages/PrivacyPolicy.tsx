import React, { FC } from "react";
import { LegalPageProps } from "./Imprint";

const PrivacyPolicy: FC<LegalPageProps> = ({ type }) => {
  return (
    <>
      {type === "public" && <div className="page-header">Privacy Policy</div>}

      <div className="content margin-medium">
        {`With our Data2Evidence Platform (following “D2E”), which registered and approved users can access by using the D2E portal, we enable you to securely access and analyze health data digitally for medical research purposes. We are committed to implementing policies, practices and processes to safeguard the collection, use and disclosure of the personal data you provide us in compliance with the Singapore Personal Data Protection Act (PDPA) 2012. 

        This information describes how Data4Life Asia  processes your personal data.`}
      </div>

      <div className="content strong">1. Controller and data protection officer</div>
      <div className="content margin-medium">
        {`The controller pursuant to Art. 4 para. 7 of the General Data Protection Regulation (GDPR) for the D2E Platform is

          D4L data4life Asia Limited
          68 Circular Road #02-01
          Singapore 049422
          Email: we@data4life-asia.care

          You can reach our data protection officer at dataprotection@data4life-asia.care or our postal address by writing to the attention of "The data protection officer".`}
      </div>

      <div className="content strong">2. Purposes and legal bases of the processing of your personal data</div>

      <div className="content strong">a. Use of D2E portal</div>
      <div className="content margin-medium">
        {`When the D2E portal is used, the following data is automatically transferred to the web server of Data4Life Asia:

          - IP address of the device used for the retrieval
          - Web address (URL) of the page from which the file was requested (referrer)
          - Date and time of the request
          - Amount of data transmitted
          - Description of the type of web browser used

          The processing of this data, which contains a (pseudonymized) personal reference via the IP address, is technically necessary and is carried out in order to provide you with the Data4Life Asia offering. The legal basis for the aforementioned processing is Art. 6 para. 1 sentence 1 lit. b GDPR (processing is necessary for the fulfillment of a contract with the data subject). 
          `}
      </div>

      <div className="content strong">b. Registration for the Data2Evidence Platform</div>
      <div className="content margin-medium">
        {`You will be registered for the D2E Platform by Data4Life Asia. In order to register for the Data4Life offering, you are required to provide your email address and your full name. 

        The legal basis for the aforementioned processing is Art. 6 para. 1 sentence 1 lit. b GDPR (processing is necessary for the fulfillment of a contract with the data subject).

        After successful registration, you can access the D2E Platform with your credentials and use the functionalities offered.
        `}
      </div>

      <div className="content strong">c. Authentication via identity as a service</div>
      <div className="content margin-medium">
        {`If you log in to your user account at the Data2Evidence Platform, the following data is collected by Data4Life Asia as part of the authentication flow:

        - date and time of request
        - username and password (in encrypted form) used
        - kind of activity that was performed, e.g., login

        The processing of this data, which contains a (pseudonymized) personal reference, is technically necessary and is carried out in order to provide you with the Data4Life Data2Evidence Platform. The legal basis for the aforementioned processing is Art. 6 para. 1 sentence 1 lit. b GDPR (processing is necessary for the fulfillment of a contract with the data subject).`}
      </div>

      <div className="content strong">d. Support/Contact</div>
      <div className="content margin-medium">
        {`When you contact us using the email provided on our website, the data you provide (for example, your email address and your name as well as the content of your inquiry) will be stored by us in order to process and answer your questions or concerns or to provide the support you require when using the Data4Life Asia offering. The legal basis for this collection of data is Art. 6 para. 1 sentence 1 lit. b GDPR (processing is necessary for the fulfillment of a contract with the data subject) when we are in the process of entering into or already have a contractual relationship. The legal basis is Art. 6 para. 1 sentence 1 lit. f GDPR (processing is necessary to safeguard the legitimate interests of the controller) if we do not have or do not plan a contractual relationship, for example, when the contact is of a general nature. Our legitimate interest in the latter case is to answer your inquiry by providing appropriate and useful information. 
        We anonymize the data arising in this context after the storage is no longer necessary (usually four weeks after we fully answered your request), or restrict the processing if there are legal storage obligations. The legal basis for the processing described above is Art. 6 para. 1 sentence 1 lit. f (processing is necessary to safeguard the legitimate interests of the controller). Data4Life has a legitimate interest in collecting key performance indicators as part of a quality management system for continuous improvement of the services offered. For this purpose, we systematically evaluate the number of contacts and the reasons for them, the processing time of inquiries and other key figures. 
        `}
      </div>

      <div className="content strong">3. Recipients or categories of recipients</div>
      <div className="content margin-medium">
        {`For the purpose of providing the necessary server infrastructure to run our website, we use Microsoft Ireland Operations, Ltd., One Microsoft Way, South County Business Park, Leopardstown, Dublin, D18 P521, Ireland. We have concluded a data processor agreement pursuant to Art. 28 para 3. GDPR with Microsoft.

        For the purpose of facilitating email communication for support and other contact Data4Life Asia discloses contact information and content data, for example, email contents, to our email service provider Heinlein Hosting GmbH, Schwedter Straße 9a, 10119 Berlin, Germany. We have concluded a data processing agreement pursuant to Art. 28 para. 3 GDPR with Heinlein Hosting.

        For the purpose of business and operational purposes, for example, support or contact, we may share your data with D4L data4life gGmbH,  c/o Digital Health Cluster (DHC) im Hasso-Plattner-Institut (HPI), Rudolf-Breitscheid-Straße 187, 14482 Potsdam, Germany.

        For the purpose of facilitating email communication for general requests and communication through email addresses with the ".care" domain extension, Data4Life Asia uses Google Workspace provided by our data processor Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. Google processes your contact information, for example, email address and the content of your email. Google stores your personal data on servers based in the European Economic Area (EEA). However, we cannot exclude that Google accesses and therefore transfers your personal data to the United States. We have concluded a data processing agreement pursuant to Art. 28 para. 3 GDPR and EU standard contractual clauses with Google.

        In all of the above mentioned cases, D4L data4life Asia Limited remains as the data controller.`}
      </div>

      <div className="content strong">4. Use of cookies</div>
      <div className="content margin-medium">
        {`When you use the Data2Evidence Platform, Data4Life Asia uses cookies. Cookies are small blocks of data created by the server and stored on your end device (laptop, tablet, smartphone or similar).


        On the D2E platform we only use strictly  necessary cookies to provide basic functionalities of the D2E portal. In the following, for the sake of uniformity, we refer to cookies when other cookie-like technologies are used, such as the storage of data as a "local storage item" in the browser. The D2E portal uses only functional cookies which mainly carry the authentication related details. These cookies are selectively attached to the server request as required.
        Access token
        ID token
        Refresh token

        The above cookies are used by the authentication flow and essential for the functionality of the application. Those cookies do not collect information about you for marketing purposes or for analysis purposes. The legal basis for the processing of data from technically necessary cookies is Art. 6 para. 1 sentence 1 lit. f GDPR (processing is necessary to protect the legitimate interests of the controller) based on our legitimate interest in a user-friendly authentication process.`}
      </div>

      <div className="content strong">5. Transfer of Personal Data</div>
      <div className="content margin-medium">
        {`Where there is a need to transfer your personal data to another country outside Singapore, we will ensure that the standard of data protection in the recipient country is comparable to that of Singapore’s PDPA. If this is not so, we will enter into a contractual agreement with the receiving party to accord similar levels of data protection as those in Singapore.`}
      </div>

      <div className="content strong">6. European Territory Users</div>
      <div className="content margin-medium">
        {`You have the following additional rights regarding personal data concerning you:
        – Right to access (Art. 15 GDPR),
        – Right to rectification (Art. 16 GDPR),
        – Right to erasure (Art. 17 GDPR; “Right to be forgotten”),
        – Right to limitation of processing (Art. 18 GDPR),
        – Right to object to the processing (Art. 21 GDPR),
        – Right to data transferability (Art. 20 GDPR).

        You also have the right to complain about our processing of your personal data to a data protection supervisory authority in the member state where you are located, at your place of work or at the location of the alleged infringement if you believe that the processing of your personal data is unlawful. The supervisory authority responsible for us is:

        Die Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht
        Stahnsdorfer Damm 77
        14532 Kleinmachnow
        Germany

        Telephone: 0049 (0)33203/356-0
        Telefax: 0049 (0)33203/356-49
        Email: poststelle@lda.brandenburg.de

        If you have given us consent to the processing of your data, you can revoke it at any time with effect for the future. The lawfulness of processing your data until revocation remains unaffected by this.

        You can contact us at  time using the contact channels listed in Section 1 above and/or the contact information listed in our imprint for the assertion of your rights or for other data protection concerns.

        Please note that if your personal data is processed on the basis of a legitimate interest within the scope of the balancing of interests pursuant to Art. 6 para.1 sentence 1 f) GDPR and/or if your personal data is processed for the purposes of direct marketing, you have the right to object to the processing of your personal data at any time. You can indicate your objection by contacting us at any time using the contact channels listed in Section 1 and/or the contact information in our imprint.`}
      </div>

      <div className="content strong">7. Changes to this privacy policy</div>
      <div className="content margin-medium">
        {`We may update this Data Privacy Notice from time to time. Please visit our website periodically to note any changes. Changes to this Notice take effect when they are posted on our website.`}
      </div>

      <div className="content margin-small">Last updated: August 2024</div>
    </>
  );
};

export default PrivacyPolicy;
