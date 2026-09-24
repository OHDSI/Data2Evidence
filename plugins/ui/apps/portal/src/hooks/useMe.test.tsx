import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useMe, invalidateMe } from "./useMe";

const mockGetMe = jest.fn();
jest.mock("../axios/api", () => ({
  api: { userMgmt: { getMe: (...args: unknown[]) => mockGetMe(...args) } },
}));

let latest: ReturnType<typeof useMe> | null = null;
const Capture = (): JSX.Element => {
  latest = useMe();
  return <div>TEST</div>;
};

beforeEach(() => {
  // The cache is module state and outlives a test, so every case starts clean.
  invalidateMe();
  mockGetMe.mockReset();
  latest = null;
});

test("reports the username usermgmt holds, not a token claim", async () => {
  mockGetMe.mockResolvedValue({ id: "u1", username: "brandan" });

  render(<Capture />);

  await waitFor(() => expect(latest![1]).toBe(false));
  // The bare name, which is what bookmark-svc writes into user_id. The
  // synthesised address brandan@d2e.local is what the ID token carries and is
  // exactly what must NOT appear here.
  expect(latest![0]).toBe("brandan");
});

// THE REASON THE FLAG EXISTS. A consumer comparing the name to a stored owner
// reads undefined as "owned by nobody"; without a way to see that the name is
// merely pending, a user's own saved work renders as absent.
test("reports loading until the name arrives", async () => {
  let resolve!: (v: { id: string; username: string }) => void;
  mockGetMe.mockReturnValue(new Promise((r) => (resolve = r)));

  render(<Capture />);

  expect(latest![1]).toBe(true);
  expect(latest![0]).toBeUndefined();

  resolve({ id: "u1", username: "brandan" });
  await waitFor(() => expect(latest![1]).toBe(false));
  expect(latest![0]).toBe("brandan");
});

test("fetches once however many components ask", async () => {
  mockGetMe.mockResolvedValue({ id: "u1", username: "brandan" });

  render(
    <>
      <Capture />
      <Capture />
      <Capture />
    </>
  );

  await waitFor(() => expect(latest![1]).toBe(false));
  expect(mockGetMe).toHaveBeenCalledTimes(1);
});

// A rejected promise left latched in `inflight` would make one failed call
// permanent for the session, which is worse than the bug being fixed.
test("a failure leaves no name and is retried by the next mount", async () => {
  mockGetMe.mockRejectedValueOnce(new Error("usermgmt down"));
  jest.spyOn(console, "error").mockImplementation(() => {});

  const first = render(<Capture />);
  await waitFor(() => expect(latest![1]).toBe(false));
  // Deliberately not falling back to some other string: a wrong name would
  // show one user another's saved work.
  expect(latest![0]).toBeUndefined();

  first.unmount();
  mockGetMe.mockResolvedValue({ id: "u1", username: "brandan" });
  render(<Capture />);

  await waitFor(() => expect(latest![0]).toBe("brandan"));
  expect(mockGetMe).toHaveBeenCalledTimes(2);
});
