import axios from "axios";

const BASE_URL = "portal/translations";

// Translations are publicly accessible, hence interceptors for auth is not
// needed.
export class Translation {
  public async getTranslation(locale: string) {
    return await axios.get<{
      [key: string]: string;
    }>(`/${locale}.json`, { baseURL: BASE_URL });
  }
}
