import { decode, JwtPayload } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { PortalAPI } from "../api/PortalAPI.ts";
import dataSource from "../db/datasource.ts";
import { getDummyDataset } from "../utils/utils.ts";

export default class StrategusAnalysisService {

    private strategusAnalysisRepository;
    private token: string;

    constructor() {
        this.strategusAnalysisRepository = dataSource.getRepository("StrategusAnalysis");
    }

    async getAllAnalysis(token: string) {
        const analysisList = await this.strategusAnalysisRepository.find();
        const portalAPI = new PortalAPI(token);
        return await Promise.all(
            analysisList.map(async (analysis) => {
                try {
                    const dataset = await portalAPI.getDataset(analysis.datasetId);
                    return { ...analysis, tokenStudyCode: dataset.tokenStudyCode };
                } catch (error) {
                    console.error(`Failed to resolve tokenStudyCode for analysis ${analysis.id} (datasetId: ${analysis.datasetId}):`, error);
                    return { ...analysis, tokenStudyCode: null };
                }
            })
        );
    }

    async getStudyAnalysis(studyId: string, token: string) {
        const analysis = await this.strategusAnalysisRepository.findOne({
            where: { studyId: studyId }
        });

        if (!analysis) return null;

        try {
            const portalAPI = new PortalAPI(token);
            const dataset = await portalAPI.getDataset(analysis.datasetId);
            return { ...analysis, tokenStudyCode: dataset.tokenStudyCode };
        } catch (error) {
            console.error(`Failed to resolve tokenStudyCode for study`, error);
            return { ...analysis, tokenStudyCode: null };
        }
    }

    async getAnalysisByDatasetId(datasetId: string) {
        const analysis = await this.strategusAnalysisRepository.findOne({ 
            where: { datasetId }
        });

        return analysis;
    }

    async createAnalysisSpec(
        token: string,
        studyId: string,
        tokenStudyCode: string,
        tenantId: string,
        notebookName: string,
        analysisSpec: string,
        mode: string
    ) {
        this.token = token;
        let analysisId = uuidv4();
        // if( !notebookName || !mode) { // TODO: uncomment this line when notebookName is available in jupyter kernel
        if(!mode) {
            // throw new Error("Missing required fields: notebookName or mode");
            throw new Error("Missing required fields: mode");
        }

        // Create dataset first before creating strategus analysis
        const portalAPI = new PortalAPI(token);
        const datasetId = uuidv4();
        
        const datasetInput = Object.assign({}, getDummyDataset(), {
            id: datasetId,
            tokenDatasetCode: tokenStudyCode,
            tenantId: tenantId,
            schemaName: `results_${studyId}`,
            detail: {
                ...getDummyDataset().detail,
                name: studyId,
            }
        });

        try {
            await portalAPI.createDataset(datasetInput);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Error creating dataset for strategus analysis:", errorMessage);
            throw new Error(`Failed to create dataset: ${errorMessage}`);
        }

        // Create new analysisSpec with datasetId
        const newAnalysis = {
            id: analysisId,
            analysisSpec,
            studyId,
            mode,
            notebookName,
            datasetId: datasetId,
        };
        await this.strategusAnalysisRepository.save(this.addOwnerInfo(newAnalysis, true));

        return { analysisId, message: "Analysis specification saved successfully." };
    }

    async updateStrategusAnalysis(token: string, tokenStudyCode: string, analysisSpec: string, databaseCode: string) {
        this.token = token;
        const portalAPI = new PortalAPI(token);
        const dataset = await portalAPI.getDatasetByToken(tokenStudyCode);
        const existingAnalysis = await this.strategusAnalysisRepository.findOne({
            where: { datasetId: dataset.id }
        });

        if (!existingAnalysis) {
            throw new Error(`Study with token ${tokenStudyCode} does not exist.`);
        }

        existingAnalysis.analysisSpec = analysisSpec;
        // databaseCode is the target dataset's database code that is needed for the analysis flow to know which database to connect to when running the analysis
        // databaseCode is known/identified when the user attempts to run/execute the analysis from the portal after the selection of dataset in the Researcher portal
        // NOTE: With this change, each study dataset corresponds to a target dataset (that is the last selected dataset in the portal before running the analysis) and the analysis results will be stored in the same database as the target dataset; And if the user runs the analysis multiple times with different target datasets, the analysis specifications will be overridden with the latest one and the results will be stored in the database corresponding to the latest target dataset
        // TODO: the databaseCode overrides the existing databaseCode and the results from different target datasets will be stored in different databases; And in the next version storing results of multiple target datasets will be handled
        if (databaseCode) {
            const portalAPI = new PortalAPI(this.token);
            try {
                await portalAPI.updateDataset(
                    existingAnalysis.datasetId,
                    databaseCode
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error("Error updating dataset for strategus analysis:", errorMessage);
                throw new Error(`Failed to update dataset: ${errorMessage}`);
            }
        }
        await this.strategusAnalysisRepository.save(existingAnalysis, this.addOwnerInfo(existingAnalysis));

        return { analysisId: existingAnalysis.id, message: "Analysis specification updated successfully." }
    }

    async saveStudyAnalysisViewerCode(studyId: string, viewerCode: string) {
        const existingAnalysis = await this.strategusAnalysisRepository.findOne({
            where: { studyId: studyId }
        });

        if (!existingAnalysis) {
            throw new Error("Study does not exist.")
        }

        await this.strategusAnalysisRepository.update({id: existingAnalysis.id}, {viewerCode: viewerCode})

        return { analysisId: existingAnalysis.id, message: "Result viewer code saved successfully." }
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
