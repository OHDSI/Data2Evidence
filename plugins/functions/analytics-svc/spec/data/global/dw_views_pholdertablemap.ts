import {mock_config} from "../pa/mock_config";
import { PholderTableMapType } from "../../../src/qe/settings/Settings";
let testSchemaName = process.env.TESTSCHEMA || "MRI";

export const dw_views_pholderTableMap = mock_config.advancedSettings.tableMapping;
