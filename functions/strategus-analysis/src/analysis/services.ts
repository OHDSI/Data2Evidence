import { v4 as uuidv4 } from "uuid";
import { decode, JwtPayload } from "jsonwebtoken";
import dataSource from "../db/datasource.ts";
import { PortalServerAPI } from "../strategus-results/api/PortalServerAPI.ts";
import { env } from "../env.ts";

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

            // Create dataset via portal API
            const portalAPI = new PortalServerAPI(token);
            
            // Generate random token code for dataset
            const randomSuffix = Math.random().toString(36).substring(2, 10);
            const tokenDatasetCode = `strategus_${randomSuffix}`;
            
            const datasetId = uuidv4();
            const datasetPayload = {
                id: datasetId,
                type: "study",
                tokenDatasetCode: tokenDatasetCode,
                tenantId: env.APP__TENANT_ID,
                schemaOption: "no_cdm",
                resultsSchemaName: "public",
                paConfigId: "00000000-0000-0000-0000-000000000000", // Default UUID
                visibilityStatus: "DEFAULT",
                detail: {
                    name: `Strategus Analysis ${studyId}`,
                    summary: "",
                    description: "",
                    showRequestAccess: false
                },
                dashboards: [],
                attributes: [],
                tags: []
            };

            try {
                await portalAPI.createDataset(datasetPayload);
            } catch (error) {
                console.error("Error creating dataset:", error);
                throw new Error(`Failed to create dataset: ${error.message}`);
            }

            // Create new analysisSpec with datasetId
            const newAnalysis = {
                id: analysisId,
                analysisSpec,
                studyId,
                mode,
                notebookName,
                datasetId
            };
            await this.strategusAnalysisRepository.save(this.addOwnerInfo(newAnalysis, true));
        }

        return { analysisId, message: "Analysis specification saved successfully." };
    }

    async saveStudyAnalysisViewerCode(studyId: string, viewerCode: string) {
        const existingAnalysis = await this.strategusAnalysisRepository.findOne({
            where: { studyId: studyId }
        });

        if (!existingAnalysis) {
            throw new Error("Study does not exist.")
        }

        await this.strategusAnalysisRepository.update({id: existingAnalysis.id}, {viewerCode: viewerCode})

        return { analysisId: existingAnalysis.analysisId, message: "Result viewer code saved successfully." }
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