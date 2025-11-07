export const getFallbackLocale = (locale: string) => {
  const arr = locale.split("-");
  if (arr.length === 1) {
    return "default";
  }
  const fallbackLocale = arr.slice(0, arr.length - 1).join("-");
  return fallbackLocale;
};

export const replaceParams = (phrase: string, params?: string[]) => {
  if (!params?.length) {
    return phrase;
  }
  let text = phrase;
  if (Array.isArray(params)) {
    for (let i = 0; i < params.length; i += 1) {
      text = text.replace(`{${i}}`, params[i]);
    }
  }
  return text;
};
