export const isDev = process.env["NODE_ENV"] === "development";

export const getRoleChanges = (
  roles: string[],
  currentRoles: string[],
  proposedRoles: string[]
): { grantRoles: string[]; withdrawRoles: string[] } => {
  let grantRoles: string[] = [],
    withdrawRoles: string[] = [];
  for (const role of roles) {
    const isRemove = currentRoles.includes(role) && !proposedRoles.includes(role);
    const isAdd = !currentRoles.includes(role) && proposedRoles.includes(role);

    if (isAdd) {
      grantRoles = [...grantRoles, role];
    } else if (isRemove) {
      withdrawRoles = [...withdrawRoles, role];
    }
  }
  return {
    grantRoles,
    withdrawRoles,
  };
};

export const saveBlobAs = (obj: Blob, filename: string) => {
  const url = URL.createObjectURL(obj);
  const link = document.createElement("a");
  link.href = url;

  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();

  if (link.parentNode) link.parentNode.removeChild(link);
};

// Function to backfill elements in an Array based on a key which represents the values containing the interval ranges
export const backFillArray = (array: any[], backFillKey: string) => {
  const arrayCopy = structuredClone(array);
  // Get all keys from object other than input backFillKey
  const objectKeys = Object.keys(array[0]).filter((e) => e !== backFillKey);
  // Find min and max range of object based on backFillKey
  let minVal = Math.min(...array.map((obj: any) => obj[backFillKey]));
  const maxVal = Math.max(...array.map((obj: any) => obj[backFillKey]));

  while (minVal <= maxVal) {
    if (!array.some((obj: any) => obj[backFillKey] === minVal)) {
      arrayCopy.push({ [backFillKey]: minVal, ...objectKeys.reduce((a, v) => ({ ...a, [v]: 0 }), {}) });
    }
    minVal++;
  }

  return arrayCopy;
};

const getRandomByte = () => {
  if (window.crypto && window.crypto.getRandomValues) {
    const result = new Uint8Array(1);
    window.crypto.getRandomValues(result);
    return result[0];
  } else {
    return Math.floor(Math.random() * 256);
  }
};

export const generateRandom = (length: number) => {
  const pattern = /[a-zA-Z0-9_\-\+\.]/;
  return Array.from({ length }, () => {
    let result;
    while (true) {
      result = String.fromCharCode(getRandomByte());
      if (pattern.test(result)) {
        return result;
      }
    }
  }).join("");
};

export const isValidJson = (json: string) => {
  try {
    JSON.parse(json);
    return true;
  } catch (e) {
    return false;
  }
};
