import axios from "axios";

const BASE_URL = "concept-sets";

// Translations are publicly accessible, hence interceptors for auth is not needed.
export class Translation {
  public async getTranslation(locale: string) {
    return await axios.get<{
      [key: string]: string;
    }>(`/${locale}.json`, { baseURL: BASE_URL });
  }
}
