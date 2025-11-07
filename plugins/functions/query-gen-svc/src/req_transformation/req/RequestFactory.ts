import {ParserContainer} from "../def/ParserContainer";
import {Patient} from "./Patient";
import {InternalFilterRepresentation as IFR} from "./InternalFilterRepresentation";
import {Config} from "../../qe/qe_config_interface/Config";

export interface Request {
    censoringThreshold: string;
    parserContainers: ParserContainer[];
    parsedRequest: any[];
    parse();
    getOptions();
    getConfig(): Config;
}

export class RequestFactory {
    public static createRequest(action: string, request: any, config: any, pHolderTable: any): Request {
        switch (action) {
            case "plugin":
            case "aggquery":
            case "boxplot":
            case "kmquery":
            case "totalpcount":
            case "patientdetail":
            case "patients_collection_service":
                return new IFR(request, config, pHolderTable);
            case "genomics_values_service":
                return new Patient(request, config, pHolderTable);
            default:
                throw new Error("FAST_INVALID_REQUEST_ACTION");
        }
    }
}
