// Global token provider reference
let getTokenFunction: (() => Promise<string>) | undefined;

export const setFetchTokenProvider = (getToken: () => Promise<string>) => {
  getTokenFunction = getToken;
};

const fetchRequest = async (url: string, options: any): Promise<any> => {
  try {
    if (getTokenFunction) {
      const token = await getTokenFunction();
      if (token != null) {
        if (!options.headers) {
          options.headers = {};
        }
        options.headers.Authorization = `Bearer ${token}`;
      }
    }
    const response = await fetch(url, options);

    return response;
  } catch (err: any) {
    console.error("Error Message:", err.message);
    throw err;
  }
};

export default fetchRequest;
