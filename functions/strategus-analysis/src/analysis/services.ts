import { v4 as uuidv4 } from "uuid";
import { decode, JwtPayload } from "jsonwebtoken";
import dataSource from "../db/datasource.ts";

export default class StrategusAnalysisService {

    private strategusAnalysisRepository;
    private token: string;

    constructor() {
        this.strategusAnalysisRepository = dataSource.getRepository("StrategusAnalysis");
    }

    async getStudyAnalysis(studyId: string) {
        const analysis = await this.strategusAnalysisRepository.findOne({
            where: { studyId: studyId }
        });
        if (!analysis) {
            throw new Error(`No analysis found for studyId: ${studyId}`);
        }
        return analysis;
    }

    async createAnalysisSpec(token, analysisSpec: string, studyId: string) {
        this.token = token;
        const analysisId = uuidv4();
        const existingAnalysis = await this.strategusAnalysisRepository.findOne({
            where: { studyId: studyId }
        });

        if (existingAnalysis) { 
            // Update existing analysisSpec
            existingAnalysis.analysisSpec = analysisSpec;;
            await this.strategusAnalysisRepository.save(this.addOwnerInfo(existingAnalysis, false));
        } else { 
            // Create new analysisSpec
            const newAnalysis = {
                id: analysisId,
                analysisSpec: analysisSpec,
                studyId: studyId
            };
            await this.strategusAnalysisRepository.save(this.addOwnerInfo(newAnalysis, true));
        }

        return { analysisId: analysisId, message: "Analysis specification saved successfully." };
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