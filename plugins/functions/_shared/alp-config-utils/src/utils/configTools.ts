import * as path from "path";

/**
 * Split the file's package and name into these two components
 *
 * @param {string}
 *            filePackageAndName - The file's path and name
 * @return {array} Array including these two components and the file extension
 */
export function extractPackageAndFile(filePackageAndName) {
    const array = filePackageAndName.split(".");

    const fileExtension = array[array.length - 1];

    array.splice(array.length - 1, 1); // remove the suffix
    const fileName = array[array.length - 1];

    array.splice(array.length - 1, 1); // remove the file name
    const packageName = array.join(".");

    const result = [packageName, fileName, fileExtension];

    return result;
}

/**
 * Loads a file from the repository.
 *
 * @function
 * @public
 * @param {filePath} string - Path of the file
 * @param {fileName} string - Name of the file
 * @param {fileExtension} string - extension of the file
 * @param {Object} Object - node fs lib when running on node
 * @returns {string} Content of the file
 */
export function loadFile(packageName: string, fileName: string, fileEnding: string, fs) {
    const filePath = path.join("cfg", packageName.replace(/\./g, "/"), fileName + "." + fileEnding);
    const contents = fs.readFileSync(filePath, "utf8");
    return JSON.parse(contents);
}
