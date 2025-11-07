import * as sqlGen from "./AstFactory";
import * as qconfig from "../qe_config_interface/Config";
import { PholderTableMapType } from "../settings/Settings";

/**
 * This is a private function which generates the sql from the FAST.
 * @param oModelConfig      		Data model config CDM.
 * @param oPlaceholderTableMap      Placeholder table mapping details.
 * @param statementObject      		FAST statement js object.
 * @returns         				generated sql object.
 */
function generateSQLInternally(oModelConfig, oPlaceholderTableMap: PholderTableMapType, statementObject): Object {

    let confHelper = new qconfig.Config(oModelConfig, oPlaceholderTableMap);
    let astFactory = sqlGen.getAstFactory(confHelper);
    let nql = astFactory.astElementFactory(JSON.parse(JSON.stringify(statementObject)), "statement", "statement", null);
    nql.generateSQL();
    return nql;
}

/**
 * This function generates and executes the SQL from FAST.
 * @param oModelConfig      		Data model config CDM.
 * @param oPlaceholderTableMap      Placeholder table mapping details.
 * @param fastObject      			FAST js object.
 * @param oConnection      			DB Connection.
 * @param callback      			Callback to be finally executed.
 */
export function executeQuery(oModelConfig, oPlaceholderTableMap: PholderTableMapType, fastObject, oConnection, callback): void {

    let nql: any = generateSQLInternally(oModelConfig, oPlaceholderTableMap, fastObject.statement);
    nql.sql.executeQuery(oConnection,  (error, result) => {
        callback(error, result);
    });
}

/**
 * This function generates the sql from the FAST.
 * @param oModelConfig      		Data model config CDM.
 * @param oPlaceholderTableMap      Placeholder table mapping details.
 * @param fastObject      			FAST js object.
 * @returns         				generated sql object.
 */
export function getSQL(oModelConfig, oPlaceholderTableMap: PholderTableMapType, fastObject): Object {
    let nql: any = generateSQLInternally(oModelConfig, oPlaceholderTableMap, fastObject.statement);
    return nql.getSQL();
}

