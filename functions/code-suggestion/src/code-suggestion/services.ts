import { IUICodeSnippet, IChatSnippet } from "../type";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModels } from "../utils/prepModels";
import { StringOutputParser } from "@langchain/core/output_parsers";

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

  try {
    const strategusIntro = `** Introduction to Strategus ** 
        The Strategus package is a new approach for coordinating and executing analytics using HADES modules. The goal is to have OHDSI network sites install Strategus and exchange an analysis specification in JSON format to execute a network study. The analysis specification will capture all of the design choices that pertain to the methods used in a given study. The analysis specification format aims to allow for combining different HADES modules together as a pipeline to execute a study.
<<<<<<< Updated upstream
        For more details on how Strategus is used as part of a network study, please see the Strategus Study Repo Template.
        1.1 Using Strategus
        The high-level steps in using Strategus consist of the following:
        1. Create the analysis specification for the study. This will include things like picking the cohorts for the study and to specify the analysis settings for each the HADES modules (i.e. Cohort Diagnostics, Comparative Cohort Study, etc). See the Creating Analysis Specification article for more details.
        2. Create the execution settings that specify how to connect to the OMOP CDM in your environment and execute your study. See the Execute Strategus for more details.
        3. Upload the results and use Shiny to view the results. See the Working with Results for more details.
        1.2 What is a HADES module?
        A HADES module aims to standardize the input and output produced by a HADES package. Each HADES module contains a function to create the settings to carry out the analytic tasks. These module settings are then added to the analysis specification to build a pipeline of analytic tasks that span one or more modules. Each HADES module is responsible for writing results as comma-separated value (.csv) files. CSV output was purposely chosen to provide transparency for the results generated so that users of Strategus can review their results before providing them to a network study coordinator. In addition to the CSV results, each module will produce a resultsDataModelSpecification.csv which describes the data-definition language (DDL) to store the CSV results in a PostgreSQL database. The definition of the resultsDataModelSpecification.csv is described in more details in the ResultModelManager documentation. Finally, each HADES module provides functions for creating the PostgreSQL results tables based on the resultsDataModelSpecification.csv and for uploading the CSV results to the results database.
        From a technical perspective, a HADES module is an R6 class that accepts the Strategus JSON analysis specification to call one or more HADES packages to produce a standardized set of results. When used with renv, Strategus provides a reproducible way to execute each step in an analysis specification by ensuring the proper dependencies are available along with the code that was used to execute the analysis.`;
=======
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
>>>>>>> Stashed changes

    const rolePrompting = `
      You are a specialized AI assistant for Strategus (OHDSI network study) analysis, combining deep expertise in:

      1. OHDSI Common Data Model (CDM), OMOP vocabulary and cohort definitions
      2. Strategus framework architecture and modules are based on ${strategusIntro}
      3. Healthcare data analysis and cohort studies
      
      userInput: ${uiChat.userInput}
      context: ${uiChat.context}

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
