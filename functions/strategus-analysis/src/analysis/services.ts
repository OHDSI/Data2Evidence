import { v4 as uuidv4 } from "uuid";
import { decode, JwtPayload } from "jsonwebtoken";
import dataSource from "../db/datasource.ts";

export default class StrategusAnalysisService {

    private strategusAnalysisRepository;
    private token: string;

    constructor() {
        this.strategusAnalysisRepository = dataSource.getRepository("StrategusAnalysis");
    }

    async getAllAnalysis() {
        const analysisList = await this.strategusAnalysisRepository.find();
        
        return analysisList;
    }

    async getStudyAnalysis(studyId: string) {
        const analysis = await this.strategusAnalysisRepository.findOne({
            where: { studyId: studyId }
        });
        
        return analysis;
    }

    async createAnalysisSpec(token, studyId: string, notebookName: string, analysisSpec: string, mode: string) {
        this.token = token;
        let analysisId = uuidv4();
        const existingAnalysis = await this.strategusAnalysisRepository.findOne({
            where: { studyId: studyId }
        });

        if (existingAnalysis) { 
            analysisId = existingAnalysis.id;
            // Update existing analysisSpec
            existingAnalysis.analysisSpec = analysisSpec;
            await this.strategusAnalysisRepository.save(this.addOwnerInfo(existingAnalysis, false));
        } else { 
            // if( !notebookName || !mode) { // TODO: uncomment this line when notebookName is available in jupyter kernel
            if(!mode) {
                // throw new Error("Missing required fields: notebookName or mode");
                throw new Error("Missing required fields: mode");
            }
            // Create new analysisSpec
            const newAnalysis = {
                id: analysisId,
                analysisSpec,
                studyId,
                mode,
                notebookName
            };
            await this.strategusAnalysisRepository.save(this.addOwnerInfo(newAnalysis, true));
        }

        return { analysisId, message: "Analysis specification saved successfully." };
    }

    private addOwnerInfo(analysis: any, isNew: boolean = false) {
        const decodedToken = decode(
            this.token.replace(/bearer /i, "")
          ) as JwtPayload;
        const currentDate = new Date();
        if (isNew) {
            return {
                ...analysis,
                createdBy: decodedToken.sub,
                modifiedBy: decodedToken.sub,
            }
        }
        return {
            ...analysis,
            modifiedBy: decodedToken.sub,
            modifiedAt: currentDate,
        };
    }

}