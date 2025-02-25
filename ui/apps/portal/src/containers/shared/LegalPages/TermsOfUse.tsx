import React, { FC } from "react";
import env from "../../../env";
import { LegalPageProps } from "./Imprint";

const TermsOfUse: FC<LegalPageProps> = ({ type }) => {
  return (
    <>
      {type === "public" && <div className="page-header">Terms of Use</div>}
      <div className="content margin-medium">{`The Data4Life offering for secure digital access and analysis of data (hereinafter also: "offering") for medical research purposes in our Data4Life Data2Evidence Platform is an offering of D4L data4life Asia Limited, 68 Circular Road #02-01, Singapore 049422 (hereinafter: "we" or "provider"). For your (hereinafter: "you" or "user") use of the offering using our Data2Evidence Platform, the contractual provisions of the following terms of use apply:`}</div>
      <div className="content margin-small strong">
        1. Registration and login, contractual relationship and user account
      </div>
      <div className="content margin-medium">
        {`1.1 Access to our offering is restricted to individuals who have received an invitation from us via email including a link to our registration page. 

          1.2 You must be at least 18 years old and have full legal capacity to register for our services.

          1.3 When registering, you must provide truthful, up-to-date and complete information and update it in case of changes.

          1.4 The contract is concluded by our confirmation of your registration. 

          1.5 Only one user account may be maintained per person.

          1.6 The contractual relationship is personal and the user account is therefore non-transferable and non-heritable.

          1.7 If we terminate the contract with you and have prohibited a registration by the same person, a new registration is prohibited.`}
      </div>
      <div className="content margin-small strong">2. Term and termination</div>

      <div className="content margin-medium">
        The contract is concluded for an indefinite period of time. The contract can be terminated by the user and the provider at any time with immediate effect.
      </div>

      <div className="content margin-small strong">3. Use of the services, user obligations, prohibited behavior</div>

      <div className="content margin-large">
        {`3.1 The services offered by the provider are free of charge for you. We do not assume any guarantee or warranty for certain functionalities or a certain availability, and we reserve the right to change functionalities of our services, unless otherwise agreed or prescribed by law.

          3.2 You must keep your access data secret and may not transmit it to third parties or have your user account used by third parties. You agree that you will be responsible to the provider for all activities that occur under your account. Please inform us immediately if you notice any misuse.

          3.3 You may only use the Data4Life Data2Evidence Platform for accessing and analysing medical or health-related data and solely within the scope of the respective study/project approved by Data4Life/data owner for non-commercial purposes and not for any other purposes, and do not infringe any rights of third parties. You are obliged to observe the statutory regulations when using the service. Additionally, You promise that You will not and will not encourage or assist any third party to:`}
      </div>

      <div className="content margin-large">
        {`  1. modify, alter, tamper with, repair or otherwise create derivative works of the offering and/or the data;
            2. reverse engineer, disassemble, decompile the offering, or attempt to discover or recreate the source code used to provide or access the offering;
            3. use the offering in any manner or for any purpose other than as expressly permitted by this TOU, the Privacy Policy, or any other policy, instruction or terms applicable to the offering;
            4. sell, lend, rent, resell, lease, sublicense or otherwise transfer any data you gain access to or analyze via the offering and/or any of the rights granted to You with respect to the offering to any third party;
            5. remove, obscure or alter any proprietary rights notice pertaining to the offering;
            6. use the offering to: (i) store or transmit inappropriate content, such as content that violates the intellectual property rights or rights to the publicity or privacy of others; (ii) store or transmit any content that contains or is used to initiate a denial of service attack, viruses or other harmful or deleterious computer code, files or programs such as Trojan horses, worms, time bombs, cancelbots, or spyware; or (iii) otherwise violate the legal rights of a third party;
            7. interfere with or disrupt servers or networks used by the provider to provide the offering or used by other users to access the offering, or violate any third-party regulations, policies or procedures of such servers or networks or harass or interfere with another user’s full use and enjoyment of the offering;
            8. access or attempt to access the provider’s other accounts, computer systems or networks not covered by these TOU, through password mining or any other means;
            9. cause, in the provider’s sole discretion, inordinate burden on the offering or the provider’s system resources or capacity.`}
      </div>

      <div className="content margin-medium">
        {`3.4 You may not use the offering and the Data2Evidence Platform for any commercial purposes without our prior consent.

          3.5 We do not check the contents stored by you in advance. However, we reserve the right to block or delete these at any time, in particular if we become aware of a legal violation of a specific content or specific contents.`}
      </div>

      <div className="content margin-small strong">4. Limitation of liability</div>

      <div className="content margin-medium">
        {`4.1 We will not be liable for any loss or damage 
            (i) that you may incur on account of using, visiting or relying on any statements, opinion, representation or information in the offering, 
            (ii) resulting from any delay in operation or transmission, communications failure, Internet access difficulties or malfunctions in equipment or software, or 
            (iii) the conduct or the views of any person who accesses or uses the offering.

          4.2 The provisions of this limitation of liability do not change the legal burden of proof.

          4.3 The above limitations of liability shall apply accordingly to the personal liability of legal representatives, employees and vicarious agents of the provider.`}
      </div>

      <div className="content margin-small strong">5. Changes to the Terms of Use</div>

      <div className="content margin-medium">
        {`5.1 With your consent or if your consent is deemed to have been given pursuant to the following paragraph, we may amend the Terms of Use (for example, when we introduce new functionalities).

          5.2 If we wish to change the Terms of Use, we will update it on ${env.REACT_APP_DN_BASE_URL}

          5.3 Irrespective of the above provisions, we reserve the right to amend the Terms of Use with effect for the future, insofar as this does not affect essential provisions of the contractual relationship with the user and these amendments are necessary in order to take account of developments (for example, changes in the legal situation or supreme court rulings, fundamental changes in market conditions that lead to a disruption of the basis of business) that were not foreseeable by us and the non-consideration of which would lead to a fundamental disruption of the contractual relationship.`}
      </div>

      <div className="content margin-small strong">6. Final provisions, miscellaneous</div>

      <div className="content margin-medium">
        {`6.1 There are no subsidiary agreements.

          6.2 Should individual provisions of these Terms of Use be or become invalid in whole or in part, the remainder of the contract shall remain valid. In this case, the invalid provision shall be replaced by the statutory provision.

          6.3 Singapore law shall apply with the exclusion of the UN Convention on Contracts for the International Sale of Goods.

          6.4 If the user has no place of jurisdiction in Singapore or is a merchant, the place of jurisdiction shall be Singapore.`}
      </div>
    </>
  );
};

export default TermsOfUse;
