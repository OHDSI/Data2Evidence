import { decode, JwtPayload } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { PortalAPI } from "../api/PortalAPI.ts";
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
        const existingAnalysis = await this.strategusAnalysisRepository.findOne({
            where: { studyId: studyId }
        });

        // if( !notebookName || !mode) { // TODO: uncomment this line when notebookName is available in jupyter kernel
        if(!mode) {
            // throw new Error("Missing required fields: notebookName or mode");
            throw new Error("Missing required fields: mode");
        }

        // Create dataset first before creating strategus analysis
        const portalAPI = new PortalAPI(token);
        const datasetId = uuidv4();
        
        const datasetInput = {
            id: datasetId,
            type: "strategus_analysis",
            tokenDatasetCode: tokenStudyCode,
            tenantId: tenantId,
            dialect: "postgres",
            databaseCode: "dummy",
            schemaName: `results_${studyId}`,
            vocabSchemaName: "",
            resultsSchemaName: "",
            dataModel: "dummy",
            visibilityStatus: "DEFAULT",
            detail: {
                name: studyId,
                summary: "Strategus analysis dataset",
                description: "",
                showRequestAccess: false,
            },
            dashboards: [],
            attributes: [],
            tags: [],
        };

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

    async updateStrategusAnalysis(studyId: string, analysisSpec: string, databaseCode: string) {
        const existingAnalysis = await this.strategusAnalysisRepository.findOne({
            where: { studyId: studyId }
        });

        if (!existingAnalysis) {
            throw new Error("Study does not exist.")
        }

        existingAnalysis.analysisSpec = analysisSpec;
        // databaseCode is the source dataset's database code that is needed for the analysis flow to know which database to connect to when running the analysis
        // databaseCode is known/identified when the user attempts to run/execute the analysis from the portal after the selection of dataset in the Researcher portal
        // NOTE: With this change, each study dataset corresponds to a source dataset (that is the last selected dataset in the portal before running the analysis) and the analysis results will be stored in the same database as the source dataset; And if the user runs the analysis multiple times with different source datasets, the analysis specifications will be overridden with the latest one and the results will be stored in the database corresponding to the latest source dataset
        // TODO: the databaseCode overrides the existing databaseCode and the results from different source datasets will be stored in different databases; And in the next version storing results of multiple source datasets will be handled
        if (databaseCode) {
            existingAnalysis.databaseCode = databaseCode;
        }
        await this.strategusAnalysisRepository.save(existingAnalysis);

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