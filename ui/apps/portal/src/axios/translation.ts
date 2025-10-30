import axios from "axios";
import { API_PATHS } from "../constants/api";

const BASE_URL = API_PATHS.PORTAL_TRANSLATIONS;

// Translations are publicly accessible, hence interceptors for auth is not
// needed.
export class Translation {
  public async getTranslation(locale: string) {
    return await axios.get<{
      [key: string]: string;
    }>(`/${locale}.json`, { baseURL: BASE_URL });
  }
}
