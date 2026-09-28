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

// THE FAILURE THAT MUST NOT LOOK LIKE AN ANSWER. A consumer compares this name
// to a stored owner, so a transient error that settles as "no name" renders
// exactly like "you have saved nothing" -- and these mounts live for the whole
// session, so a later mount never comes to correct it.
test("a transient failure is retried and still resolves, without ever settling", async () => {
  mockGetMe
    .mockRejectedValueOnce(new Error("usermgmt restarting"))
    .mockResolvedValue({ id: "u1", username: "brandan" });

  render(<Capture />);

  // Still pending across the retry rather than briefly reported as resolved.
  expect(latest![1]).toBe(true);

  await waitFor(() => expect(latest![0]).toBe("brandan"));
  expect(mockGetMe).toHaveBeenCalledTimes(2);
});

// RETRY AMPLIFICATION. trex rate-limits per client address and an e2e run comes
// from one, so the bucket is shared across the whole suite. Retrying a throttled
// request spends more of it: this hook's own retries made /me the most-requested
// endpoint on the page -- three calls, all 429 -- while dataset/list was
// throttled beside it and the portal rendered "No dataset available".
test("does not retry a rate-limited request", async () => {
  const tooMany = Object.assign(new Error("Too many requests"), {
    response: { status: 429 },
  });
  mockGetMe.mockRejectedValue(tooMany);
  jest.spyOn(console, "error").mockImplementation(() => {});

  render(<Capture />);

  await waitFor(() => expect(latest![1]).toBe(false));
  expect(latest![0]).toBeUndefined();
  // Exactly one call: asking again is what made the throttling worse.
  expect(mockGetMe).toHaveBeenCalledTimes(1);
});

// THE SHAPE THAT ACTUALLY ARRIVES. axios/request.ts rejects with
// `error.response || error.message`, so consumers get the response itself and
// the status sits at the top level. A guard reading only `error.response.status`
// saw undefined and retried every throttled call.
test("recognises the rejection shape axios/request.ts actually produces", async () => {
  mockGetMe.mockRejectedValue({ status: 429, data: "Too many requests", headers: {} });
  jest.spyOn(console, "error").mockImplementation(() => {});

  render(<Capture />);

  await waitFor(() => expect(latest![1]).toBe(false));
  expect(mockGetMe).toHaveBeenCalledTimes(1);
});

test("does not retry a 4xx that will not answer differently", async () => {
  const badRequest = Object.assign(new Error("Bad Request"), {
    response: { status: 400 },
  });
  mockGetMe.mockRejectedValue(badRequest);
  jest.spyOn(console, "error").mockImplementation(() => {});

  render(<Capture />);

  await waitFor(() => expect(latest![1]).toBe(false));
  expect(mockGetMe).toHaveBeenCalledTimes(1);
});

// The transient it does exist for.
test("retries a 5xx, which is what a worker restart looks like", async () => {
  const serverError = Object.assign(new Error("Bad Gateway"), {
    response: { status: 502 },
  });
  mockGetMe
    .mockRejectedValueOnce(serverError)
    .mockResolvedValue({ id: "u1", username: "brandan" });

  render(<Capture />);

  await waitFor(() => expect(latest![0]).toBe("brandan"));
  expect(mockGetMe).toHaveBeenCalledTimes(2);
});

test("gives up after a bounded number of attempts", async () => {
  mockGetMe.mockRejectedValue(new Error("usermgmt down"));
  jest.spyOn(console, "error").mockImplementation(() => {});

  render(<Capture />);

  await waitFor(() => expect(latest![1]).toBe(false), { timeout: 5000 });
  expect(latest![0]).toBeUndefined();
  // Bounded: a hard outage must not spin forever.
  expect(mockGetMe).toHaveBeenCalledTimes(3);
});

// A rejected promise left latched in `inflight` would make one failed call
// permanent for the session, which is worse than the bug being fixed.
test("an exhausted sequence is retried by the next mount", async () => {
  mockGetMe.mockRejectedValue(new Error("usermgmt down"));
  jest.spyOn(console, "error").mockImplementation(() => {});

  const first = render(<Capture />);
  // Longer than the retry sequence, which is the point of the test.
  await waitFor(() => expect(latest![1]).toBe(false), { timeout: 5000 });
  // Deliberately not falling back to some other string: a wrong name would
  // show one user another's saved work.
  expect(latest![0]).toBeUndefined();

  first.unmount();
  mockGetMe.mockResolvedValue({ id: "u1", username: "brandan" });
  render(<Capture />);

  await waitFor(() => expect(latest![0]).toBe("brandan"));
  // Three from the exhausted sequence, then one from the fresh mount: nothing
  // is latched, so the session recovers as soon as usermgmt does.
  expect(mockGetMe).toHaveBeenCalledTimes(4);
});
