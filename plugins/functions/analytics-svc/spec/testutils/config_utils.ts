// tslint:disable:no-console
import { createConnection } from "./connection";

export async function insertConfig({ Id, Version, Status, Name, Type, Data }) {

    let query =  `INSERT INTO "ConfigDbModels_Config"
    ("Id", "Version", "Status", "Name", "Type", "Creator", "Created", "Modifier", "Modified", "Data")
    VALUES (?,?,?,?,?,?,CURRENT_UTCTIMESTAMP,?,CURRENT_UTCTIMESTAMP,?)`;
    let parameters = [
        { value: Id },
        { value: Version },
        { value: Status },
        { value: Name },
        { value: Type },
        { value: "" },
        { value: "" },
        { value: JSON.stringify(Data) }];

    return new Promise(async (resolve, reject) => {
        try {
            const connectionObj = await createConnection();
            connectionObj.executeUpdate(query, parameters, (err, data) => {
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        } catch (err) {
            reject(err);
        }
    });
}

export async function deleteConfig({ Id }) {

    return new Promise(async (resolve, reject) => {
        try {
            const connectionObj = await createConnection();
            connectionObj.executeUpdate(`delete from  "ConfigDbModels_Config" where "Id" = '${Id}'`, [],  (err, data) => {
              if (err) {
                  return reject(err);
              }
              resolve(data);
            });
        } catch (err) {
            reject(err);
        }
    });
}
