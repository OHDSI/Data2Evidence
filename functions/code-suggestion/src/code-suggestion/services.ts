import { IUICodeSnippet, IChatSnippet } from "../type";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModels } from "../utils/prepModels";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { MCPManager } from "../mcp/mcpManager";

export const getCodeSuggestion = async (uiCode: IUICodeSnippet) => {
  const context = `
  You are an intelligent code auto-completion tool.
  Instructions:
          1. Your response must begin with the exact code snippet achieved from role of user, without any labels or prefixes.
          2. Immediately after the given code, without adding a new line, provide a completion for the current line or statement.
          3. The completion should be a direct continuation of the given code.
          4. Ensure the completion is syntactically correct and logically coherent.
          5. Provide a complete and useful code snippet, not just the given code.
          6. Do not include any explanations, comments, or labels in your response.
          
          Complete the code (your response MUST start with and be longer than the given code)
  `;

  const model = await getModels(uiCode.model);
  if (model === null) {
    throw Error(`LLM Model - ${uiCode.model} not found.`);
  }
  if (model === "local") {
    const query =
      context +
      `Here is the code snippet achieved from role of user: '${uiCode.code}'`;
    // Calling local model
    const stream = await Trex.ask(query, {
      repo: "QuantFactory/Dolphin3.0-Llama3.2-1B-GGUF",
      model: "Dolphin3.0-Llama3.2-1B.Q4_K_M.gguf",
    });
    const reader = stream.getReader();
    return reader;
  }

  try {
    const messages = [
      new SystemMessage(context),
      new HumanMessage(uiCode.code),
    ];
    const response = await model.invoke(messages);
    const codeSuggest = response.content;
    return codeSuggest;
  } catch (error) {
    throw error;
  }
};

export const getChatResponse = async (uiChat: IChatSnippet) => {
  const model = await getModels(uiChat.model);

  if (model === null) {
    throw Error(`LLM Model - ${uiChat.model} not found.`);
  }

  // Initialize MCP if requested and available
  let mcpContext = "";
  uiChat.useMcp = true;
  if (uiChat.useMcp === true) {
    try {
      const mcpManager = MCPManager.getInstance();
      if (!mcpManager.isReady()) {
        console.log("Initializing MCP Manager...");
        await mcpManager.initialize();
      }

      const mcpClient = mcpManager.getClient();
      // Try to get cohort information using MCP if the query mentions cohorts
      if (uiChat.userInput.toLowerCase().includes("cohort")) {
        try {
          const tools = await mcpClient.listTools();
          const cohortTool = tools.find(
            (t: any) => t.name === "get_cohort_id_name_list"
          );
          if (cohortTool) {
            const toolResponse = await mcpClient.callTool(
              "get_cohort_id_name_list",
              {
                cohortInfo: uiChat.userInput,
              }
            );
            if (toolResponse?.structuredContent?.cohortsId) {
              const cohorts = toolResponse.structuredContent.cohortsId;
              mcpContext = `\n\nAvailable cohorts from MCP:\n${JSON.stringify(
                cohorts,
                null,
                2
              )}`;
            }
          }
        } catch (mcpError) {
          console.warn(
            "MCP tool call failed, continuing without MCP data:",
            mcpError
          );
        }
      }
    } catch (mcpError) {
      console.warn(
        "MCP initialization failed, continuing without MCP:",
        mcpError
      );
    }
  }

  try {
    const strategusIntro = `** Introduction to Strategus ** 
        The Strategus package is a new approach for coordinating and executing analytics using HADES modules. The goal is to have OHDSI network sites install Strategus and exchange an analysis specification in JSON format to execute a network study. The analysis specification will capture all of the design choices that pertain to the methods used in a given study. The analysis specification format aims to allow for combining different HADES modules together as a pipeline to execute a study.
        1 Using Strategus
        The high-level steps in using Strategus consist of the following:
        a. Create the analysis specification for the study. This will include things like picking the cohorts for the study and to specify the analysis settings for each the HADES modules (i.e. Cohort Diagnostics, Comparative Cohort Study, etc). See the Creating Analysis Specification article for more details.
        b. Create the execution settings that specify how to connect to the OMOP CDM in your environment and execute your study. See the Execute Strategus for more details.
        c. Upload the results and use Shiny to view the results. See the Working with Results for more details.

        2 Details of Using Strategus
        1.1 To start, we’ll need to define cohorts using:
        \`\`\`r
        library(rD2E)
        library(Strategus)
        cohorts_set <- c(15, 16, 17, 18) # example cohort definition ids
        cohortDefinitionSet <- rD2E::get_cohort_definition_set(cohorts_set)
        \`\`\`

        1.2 Creating an Analysis Specification
        module <- ModuleClass$new()\` → \`moduleSpecs <- module$createModuleSpecifications(params)\`

        ### 1. CohortGenerator
        \`\`\`r
        cgModule <- CohortGeneratorModule$new()
        # Shared resources:
        cohortDefinitionSharedResource <- cgModule$createCohortSharedResourceSpecifications(cohortDefinitionSet)
        ncoSharedResource <- cgModule$createNegativeControlOutcomeCohortSharedResourceSpecifications(negativeControlOutcomeCohortSet, occurrenceType, detectOnDescendants)
        # Module specs:
        cohortGeneratorModuleSpecifications <- cgModule$createModuleSpecifications(generateStats)
        \`\`\`

        ### 2. CohortDiagnostics
        \`\`\`r
        cdModule <- CohortDiagnosticsModule$new()
        cohortDiagnosticsModuleSpecifications <- cdModule$createModuleSpecifications(
          runInclusionStatistics, runIncludedSourceConcepts, runOrphanConcepts, runTimeSeries, 
          runVisitContext, runBreakdownIndexEvents, runIncidenceRate, runCohortRelationship, 
          runTemporalCohortCharacterization)
        \`\`\`

        ### 3. CohortIncidence
        \`\`\`r
        ciModule <- CohortIncidenceModule$new()
        cohortIncidenceModuleSpecifications <- ciModule$createModuleSpecifications(irDesign)
        # Helper: CohortIncidence::createIncidenceDesign(targetDefs, outcomeDefs, tars, analysisList, strataSettings)
        \`\`\`

        ### 4. Characterization
        \`\`\`r
        cModule <- CharacterizationModule$new()
        characterizationModuleSpecifications <- cModule$createModuleSpecifications(targetIds, outcomeIds)
        \`\`\`

        ### 5. CohortMethod
        \`\`\`r
        cmModule <- CohortMethodModule$new()
        cohortMethodModuleSpecifications <- cmModule$createModuleSpecifications(cmAnalysisList, targetComparatorOutcomesList, analysesToExclude)
        # Key helpers: CohortMethod::createCmAnalysis(), createTargetComparatorOutcomes()
        \`\`\`

        ### 6. SelfControlledCaseSeries
        \`\`\`r
        sccsModule <- SelfControlledCaseSeriesModule$new()
        sccsModuleSpecifications <- sccsModule$createModuleSpecifications(sccsAnalysisList, exposuresOutcomeList, combineDataFetchAcrossOutcomes)
        # Key helpers: SelfControlledCaseSeries::createSccsAnalysis(), createExposuresOutcome()
        \`\`\`

        ### 7. PatientLevelPrediction
        \`\`\`r
        plpModule <- PatientLevelPredictionModule$new()
        plpModuleSpecifications <- plpModule$createModuleSpecifications(modelDesignList)
        # Key helper: PatientLevelPrediction::createModelDesign()
        \`\`\`

        ### 8. Assembly Pattern
        \`\`\`r
        analysisSpecifications <- createEmptyAnalysisSpecificiations() %>%
          addSharedResources(cohortDefinitionSharedResource) %>%
          addSharedResources(ncoSharedResource) %>%
          addModuleSpecifications(cohortGeneratorModuleSpecifications) %>%
          addModuleSpecifications(cohortDiagnosticsModuleSpecifications) %>%
          addModuleSpecifications(cohortIncidenceModuleSpecifications) %>%
          addModuleSpecifications(characterizationModuleSpecifications) %>%
          addModuleSpecifications(cohortMethodModuleSpecifications) %>%
          addModuleSpecifications(sccsModuleSpecifications) %>%
          addModuleSpecifications(plpModuleSpecifications)
        \`\`\`

        1.3 Executing Strategus
        ## Key Parameters
        - \`workDatabaseSchema\` - Schema for work tables
        - \`cdmDatabaseSchema\` - Schema with OMOP CDM
        - \`workFolder\` - Local work directory
        - \`resultsFolder\` - Local results directory

        ## Execution Settings
        ### CDM Execution Settings
        \`\`\`r
        executionSettings <- createCdmExecutionSettings(
          workDatabaseSchema = "main",
          cdmDatabaseSchema = "main", 
          cohortTableNames = CohortGenerator::getCohortTableNames(),
          workFolder = file.path(outputFolder, "work_folder"),
          resultsFolder = file.path(outputFolder, "results_folder"),
          minCellCount = 5
        )
        \`\`\`

        ## Execute Study
        \`\`\`r
        execute(
          connectionDetails = connectionDetails,
          analysisSpecifications = analysisSpecifications, 
          executionSettings = executionSettings
        )
        \`\`\`
        1.4 Key Rules
        - **CohortGenerator creates shared resources** used by other modules
        - **Leave the cohort id to users when extracting the cohortDefinitionSet
        - **Use exact function names and parameter structures** from above
        - **Add shared resources after all module specifications are set**
        - **Follow the instantiation → configuration → assembly pattern → execution**

        Provide complete, working code examples using the exact Strategus syntax shown above.`;

    const rolePrompting = `
      You are a specialized AI assistant for Strategus (OHDSI network study) analysis, combining deep expertise in:

      1. OHDSI Common Data Model (CDM), OMOP vocabulary and cohort definitions
      2. Strategus framework architecture and modules
      3. Healthcare data analysis and cohort studies
      
      userInput: ${uiChat.userInput}
      context: ${uiChat.context}${mcpContext}

      Core Directive: 
      1. Provide immediate, actionable solutions based on [userInput] and [context]. 
          - If [userInput] directly relates to the [context] code → provide solution that builds upon/extends the [context]
          - If [userInput] touches on similar concepts in [context] → reference context where applicable and provide comprehensive solution
          - if [userInput] has minimal connection with [context] → focus on answering the user's actual question.
      2. R programming, particularly with OHDSI R packages (DatabaseConnector, SqlRender, CohortGenerator, etc.)
      3. Assume standard OHDSI configurations, and only verified OHDSI/Strategus functions those are based on ${strategusIntro}.
      4. If uncertain about exact function syntax, better to provide incomplete but accurate code than complete but fictional code.
      5. Minimize follow-up questions unless absolutely critical information is missing.
      6. Start directly with the solution and end with the solution - no concluding summaries or "let me know if you need help" statements.
      7. If cohort information was provided via MCP context, use the actual cohort IDs and names from that data.

      Response Structure:
      1. Direct solution with code example.
      2. Reference existing variables/functions from [context] where applicable
          - Show how to extend or modify existing [context] code
          - If minimal connection, omit this section entirely
      3. Key considerations: a) maximum 3 bullet points; b) brief technical notes; c) performance/best practice tips; d) essential technical requirements only.
    `;

    const messages = [
      new SystemMessage(rolePrompting),
      new HumanMessage(uiChat.userInput),
    ];
    // streaming
    const outputParser = new StringOutputParser();
    const streamingChain = model.pipe(outputParser);
    const stream = await streamingChain.stream(messages);
    return stream;
  } catch (error) {
    throw error;
  }
};
