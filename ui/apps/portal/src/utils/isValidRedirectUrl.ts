export const isValidRedirectUrl = (url: string) => {
  // Add aditional redirect urls here to be checked
  const dashboardUrlRegex = /\/dashboard\/.+$/i;
  if (dashboardUrlRegex.test(url)) return true;
};
