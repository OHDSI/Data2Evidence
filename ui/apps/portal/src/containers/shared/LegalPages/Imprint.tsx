import React, { FC } from "react";

export interface LegalPageProps {
  type?: string;
}

const Imprint: FC<LegalPageProps> = ({ type }) => {
  return (
    <>
      {type === "public" && <div className="page-header">Imprint</div>}
      <div className="sub-header">
        <strong>D4L data4life Asia Limited</strong>
      </div>
      <div className="content margin-small">
        {`68 Circular Road #02-01
          Singapore 049422`}
      </div>

      <div className="content margin-small">
        Email: <a href={"mailto:" + "we@data4life-asia.care"}>we@data4life-asia.care</a>
      </div>

      <div className="content margin-small">
        {`Managing Director: Christian-Cornelius Weiß 
          Register No.: UEN: 201916873K`}
      </div>
    </>
  );
};

export default Imprint;
