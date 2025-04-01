import React, { FC, createRef, useEffect, useState } from "react";
import "./Sqleditor.scss";
import "gethue/lib/components/SqlScratchpadWebComponent";
import { getAuthToken } from "../../../containers/auth";
import { Loader } from "@portal/components";

const SQLEDITOR__BASE_URL = "alp-sqleditor";
const SQLEDITOR__DB_DIALECT = "postgresql";
const SQLEDITOR__STYLESHEET_PATH = "/portal/assets/sqleditor.css";

const Sqleditor: FC = () => {
  const [xhrNew, setXhrNew] = useState<boolean>(false);
  const inputRef: React.RefObject<HTMLDivElement> = createRef();

  useEffect(() => {
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = async function (data) {
      // Intercept the request here
      this.setRequestHeader("Authorization", `Bearer ${await getAuthToken()}`);
      originalSend.apply(this, [data]);
    };
    setXhrNew(true);

    return () => {
      // component will unmount
      XMLHttpRequest.prototype.send = originalSend;
    };
  }, []);

  useEffect(() => {
    const addSqleditorStylesheet = () => {
      let link: HTMLLinkElement | null = document.querySelector(`link[href="${SQLEDITOR__STYLESHEET_PATH}"]`);
      if (!link) {
        // Create link
        link = document.createElement("link");
        link.href = SQLEDITOR__STYLESHEET_PATH;
        link.rel = "stylesheet";
        document.body.appendChild(link);
      }
      return () => {
        if (link) {
          document.body.removeChild(link);
        }
      };
    };
    if (inputRef.current) {
      const cleanupCallback = addSqleditorStylesheet();
      return () => cleanupCallback();
    }
  }, [inputRef]);

  if (!xhrNew) {
    return <Loader />;
  }

  return (
    <div className="sqleditor__container">
      <sql-scratchpad ref={inputRef} api-url={SQLEDITOR__BASE_URL} dialect={SQLEDITOR__DB_DIALECT}></sql-scratchpad>
    </div>
  );
};

export default Sqleditor;
