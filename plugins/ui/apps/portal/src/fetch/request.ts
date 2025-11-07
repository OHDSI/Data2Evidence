import { getAuthToken } from "../containers/auth/auth";

const fetchRequest = async (url: string, options: any): Promise<any> => {
  try {
    const token = await getAuthToken(false);
    if (token != null) {
      if (!options.headers) {
        options.headers = {};
      }
      options.headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(url, options);

    return response;
  } catch (err: any) {
    console.error("Error Message:", err.message);
    throw err;
  }
};

export default fetchRequest;
