import { Node } from "reactflow";

export const csvToJSON = async (
  file: File,
  delimiter: string = ","
): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      const csvText = reader.result as string;
      const lines = csvText.split("\n");
      const headers = lines[0].split(delimiter).map((header) => header.trim());

      const jsonArray = lines
        .slice(1)
        .filter((line) => line.trim() !== "") // Skip empty lines
        .map((line) => {
          const values = line.split(delimiter);
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index]?.trim() || "";
            return obj;
          }, {} as any);
        });

      resolve(jsonArray);
    };
    reader.onerror = (error) => reject(error);
  });
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

// prevent subflow from connecting to its children
export const isNested = (
  nodes: Node[],
  source: string,
  target: string
): boolean => {
  let isNested = false;
  const node = nodes.find((n) => n.id === source);
  if (node.parentId) {
    isNested = node.parentId === target;
  } else {
    if (node.type === "subflow") {
      // find all children
      const children = nodes.filter((n) => n.parentId === source);
      for (var child of children) {
        if (child.id === target) {
          isNested = true;
          break;
        }
      }
    }
  }
  return isNested;
};
