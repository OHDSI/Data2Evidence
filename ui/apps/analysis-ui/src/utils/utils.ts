export const isValidJson = (json: string) => {
  try {
    JSON.parse(json);
    return true;
  } catch (e) {
    return false;
  }
};

export const isValid2dArray = (value: string) => {
  try {
    if (value.startsWith("[[") && value.endsWith("]]")) {
      JSON.parse(value);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const isCircular = (routes, source, target): boolean => {
  let isCyclic = false;
  const destinations = routes[target];
  if (destinations) {
    if (destinations.includes(source)) {
      return true;
    } else {
      for (const nextTarget of destinations) {
        isCyclic = isCircular(routes, source, nextTarget);
      }
    }
  }
  return isCyclic;
};
