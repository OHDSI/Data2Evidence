import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

// Mock the hook to isolate this component from network/effects
jest.mock("../../../../hooks/useLinkedAccounts", () => ({
  useLinkedAccounts: jest.fn(),
}));

import { LinkedAccountsSection } from "../LinkedAccountsSection";
import { useLinkedAccounts } from "../../../../hooks/useLinkedAccounts";

const baseHookValue = {
  accounts: [] as any[],
  loading: false,
  error: undefined,
  reload: jest.fn(),
  linkPhysionet: jest.fn(),
  refreshPhysionet: jest.fn(),
  unlinkPhysionet: jest.fn(),
};

describe("LinkedAccountsSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows Link button when no linked account exists", () => {
    (useLinkedAccounts as jest.Mock).mockReturnValue({ ...baseHookValue });
    render(<LinkedAccountsSection />);
    expect(screen.getByRole("button", { name: /link physionet/i })).toBeInTheDocument();
  });

  it("shows username + Refresh + Unlink when linked", () => {
    (useLinkedAccounts as jest.Mock).mockReturnValue({
      ...baseHookValue,
      accounts: [
        {
          provider: "physionet",
          username: "alice",
          lastSyncedAt: "2026-05-17T10:00:00Z",
          lastSyncError: null,
        },
      ],
    });
    render(<LinkedAccountsSection />);
    expect(screen.getByText(/alice/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh now/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unlink/i })).toBeInTheDocument();
  });

  it("surfaces lastSyncError inline", () => {
    (useLinkedAccounts as jest.Mock).mockReturnValue({
      ...baseHookValue,
      accounts: [
        {
          provider: "physionet",
          username: "alice",
          lastSyncedAt: null,
          lastSyncError: "link revoked upstream",
        },
      ],
    });
    render(<LinkedAccountsSection />);
    expect(screen.getByRole("alert")).toHaveTextContent(/link revoked upstream/i);
  });

  it("renders Loading state", () => {
    (useLinkedAccounts as jest.Mock).mockReturnValue({ ...baseHookValue, loading: true });
    render(<LinkedAccountsSection />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
