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

// storage-api answers a missing bucket with HTTP 400 and {"statusCode":"404"}.
export function isBucketNotFound(status: number, body: string): boolean {
  if (status === 404) {
    return true;
  }
  try {
    return String(JSON.parse(body)?.statusCode) === "404";
  } catch {
    return false;
  }
}
