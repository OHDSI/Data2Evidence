// storage-api answers a duplicate bucket with HTTP 400 and the real status in
// the body ({"statusCode":"409","error":"Duplicate"}); older versions send 409.
export function isBucketAlreadyExists(status: number, body: string): boolean {
  if (status === 409) {
    return true;
  }
  try {
    const parsed = JSON.parse(body);
    return String(parsed?.statusCode) === "409" || parsed?.error === "Duplicate";
  } catch {
    return false;
  }
}
