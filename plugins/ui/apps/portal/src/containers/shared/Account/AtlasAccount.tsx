import React, { FC, useEffect } from "react";
import { Account } from "./Account";
import { Header } from "../../../components/Header/Header";

/**
 * Standalone account page served at /atlas/account for the Atlas user-menu link.
 * Renders the shared Account content (same as the retired researcher account
 * page) under the standard portal Header in its "atlas" variant — the Account
 * tab but no plugin/dataset navigation menus.
 *
 * The Header's own logo click navigates within the portal; here a capture-phase
 * interceptor redirects it to the Atlas home page instead (Atlas is served
 * outside the portal SPA), without modifying the shared Header component.
 */
export const AtlasAccount: FC = () => {
  useEffect(() => {
    const onLogoClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const logo = target && target.closest ? target.closest(".portal__header .logo") : null;
      if (!logo) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      window.location.href = `${window.location.origin}/atlas/`;
    };
    // Capture phase: run before Header's own logo onClick (which would navigate
    // to an empty subPath for the atlas portalType).
    document.addEventListener("click", onLogoClick, true);
    return () => document.removeEventListener("click", onLogoClick, true);
  }, []);

  return (
    <div className="atlas-account" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header portalType="atlas" />
      <main style={{ flex: "1 1 auto", minHeight: 0 }}>
        <Account portalType="researcher" />
      </main>
    </div>
  );
};
