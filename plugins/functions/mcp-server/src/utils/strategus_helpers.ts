export async function get_strategus_module_list() {
  const module_list = [
    {
      name: "CohortGenerator",
      description: `This R package contains functions for generating cohorts and cohort subsets using data in the CDM.
      Features - Create a cohort table and generate cohorts against an OMOP CDM.
      Get the count of subjects and events in a cohort.
      Define subsets of cohorts using different criteria or other cohorts.
      Provides functions for performing incremental tasks. This is used by CohortGenerator to skip any cohorts that were successfully generated in a previous run. 
      This functionality is generic enough for other packages to use for performing their own incremental tasks.`,
    },
    {
      name: "Characterization",
      description: `Characterization is an R package for performing characterization of a target and a comparator cohort.
      Features - Compute time to event. Compute dechallenge and rechallenge. 
      Computer characterization of target cohort with and without occurring in an outcome cohort during some time at risk
      Run multiple characterization analyses efficiently.
      upload results to database.
      export results as csv files`,
    },
    {
      name: "CohortDiagnostics",
      description: `Introduction - CohortDiagnostics is an R utility package for the development and evaluation of phenotype algorithms for OMOP CDM compliant data sets. 
      This package provides a standard, end to end, set of analytics for understanding patient capture including data generation and result exploration 
      through an R Shiny interface. 
      Analytics computed include cohort characteristics, record counts, index event misclassification, captured observation windows and basic incidence 
      rates and proportions for age, gender and calendar year (based crude data set wide metrics). 
      Through the identification of errors, CohortDiagnostics enables the comparison of multiple candidate cohort definitions across one or more 
      data sources, facilitating reproducible research.
      Features - Show cohort inclusion rule attrition.
      List all source codes used when running a cohort definition on a specific database.
      Find orphan codes, (source) codes that should be, but are not included in a particular concept set.
      Compute cohort incidence across calendar years, age, and gender.
      Break down index events into the specific concepts that triggered them.
      Compute overlap between two cohorts.
      Characterize cohorts, and compare these characterizations. Perform cohort comparison and temporal comparisons.
      Explore patient profiles of a random sample of subjects in a cohort.`,
    },
    {
      name: "CohortIncidence",
      description: `Introduction - An R package and Java library for calculating incidence rates on the OMOP CDM.
      Features - Handles specifications of T-O-TAR-Subgroup pairs, and performs the calculation on the cross-product of the elements.
      Specify clean windows to account for immortal time after outcome.
      Allows multiple exposure and multiple outcomes per person accounting for time at risk and clean window paramaters.`,
    },
    {
      name: "CohortMethod",
      description: `Introduction - CohortMethod is an R package for performing new-user cohort studies in an observational database in the OMOP Common Data Model.
      Features - Extracts the necessary data from a database in OMOP Common Data Model format.
      Uses a large set of covariates for both the propensity and outcome model, including for example all drugs, diagnoses, procedures, as well as age, comorbidity indexes, etc.
      Large scale regularized regression to fit the propensity and outcome models.
      Includes function for trimming, stratifying, matching, and weighting on propensity scores.
      Includes diagnostic functions, including propensity score distribution plots and plots showing covariate balance before and after matching and/or trimming.
      Supported outcome models are (conditional) logistic regression, (conditional) Poisson regression, and (conditional) Cox regression.`,
    },
    {
      name: "PatientLevelPrediction",
      description: `Introduction - PatientLevelPrediction is an R package for building and validating patient-level predictive models 
      using data in the OMOP Common Data Model format.
      Features - Takes one or more target cohorts (Ts) and one or more outcome cohorts (Os) and develops and validates models for all T and O combinations.
      Allows for multiple prediction design options.
      Extracts the necessary data from a database in OMOP Common Data Model format for multiple covariate settings.
      Uses a large set of covariates including for example all drugs, diagnoses, procedures, as well as age, comorbidity indexes, and custom covariates.
      Allows you to add custom covariates or cohort covariates.
      Includes a large number of state-of-the-art machine learning algorithms that can be used to develop predictive models, including Regularized logistic regression, Random forest, Gradient boosting machines, Decision tree, Naive Bayes, K-nearest neighbours, Neural network, AdaBoost and Support vector machines.
      Allows you to add custom algorithms.
      Allows you to add custom feature engineering
      Allows you to add custom under/over sampling (or any other sampling) [note: based on existing research this is not recommended]
      Contains functionality to externally validate models.
      Includes functions to plot and explore model performance (ROC + Calibration).
      Build ensemble models using EnsemblePatientLevelPrediction.
      Build Deep Learning models using DeepPatientLevelPrediction.
      Generates learning curves.
      Includes a shiny app to interactively view and explore results.
      In the shiny app you can create a html file document (report or protocol) containing all the study results`,
    },
    {
      name: "SelfControlledCaseSeries",
      description: `Introduction - 
      SelfControlledCaseSeries is an R package for performing Self-Controlled Case Series (SCCS) analyses in an observational database in the OMOP Common Data Model.
      Features - 
      Extracts the necessary data from a database in OMOP Common Data Model format.
      Optionally add seasonality using a spline function.
      Optionally add age using a spline function.
      Optionally add calendar time using a spline function.
      Optionally correct for event-dependent censoring of the observation period.
      Optionally add many covariates in one analysis (e.g. all drugs).
      Options for constructing different types of covariates and risk windows, including pre-exposure windows (to capture contra-indications).
      Optionally use regularization on all covariates except the outcome of interest.
      Also provides the self-controlled risk interval design as a special case of the SCCS.
      Includes diagnostics for all major assumptions of the SCCS design.`,
    },
    {
      name: "TreatmentPatterns",
      description: `This R package contains the resources for performing a treatment pathway analysis of a study population of interest in observational databases. 
      The package partially relies on the Observational Medical Outcomes Partnership Common Data Model (OMOP CDM), but the main parts of the package are 
      also usable with different data formats.
      Features - 
      Compatible with JSON, SQL, or CapR cohorts.
      Compatible with DatabaseConnector, CohortGenerator, and CDMConnector.
      Stratification by age, sex, and index year.
      Treatment type agnostic.
      Full control over treatment pathway definition:
      Duration of treatments
      Overlap of treatments
      Gaps between treatments
      Intermediate patient level results can be reviewed, aggregate data can be shared.
      Easily integrate Sankey diagrams and sunburst plots (htmlWidget) into ShinyApps or web-pages.`,
    },
  ];
  return module_list;
}

export async function strategus_system_prompt() {
  const instructions = `User wants to create analysis specification for a network study using Ohdsi Strategus framework. 
            The specification file, composed of R code, contains all the Strategus modules and their corresponding settings. 
            Your task is to help the user generate this analysis specification file.
              To do this task, consider the following guidelines:
              1. Strategus framework has many modules designed for specific analytic tasks. Based on the user requirements, 
              estimate the necessary Strategus modules to be used. Understand the intent of the network study and find 
              the most suitable modules from the available Strategus modules list. If the intent is unclear, ask clarifying 
              questions to the user before proceeding.
              2. Each network study has cohorts, so make sure to identify the cohorts needed for this study and include 
              CohortGenerator module in analysis specification file. 
              Use the cohort definitions provided by the user or suggest  appropriate cohort definitions based on the 
              study objectives.
              3. Next, include the necessary Strategus modules, along with their settings, to fulfill the study requirements.
              4. All these modules are added to the empty analysis specification template provided by Strategus framework.
              5. For each Strategus module, make sure you are using the valid R code syntax that exist in that module.
              Validate the generated R code for syntax correctness and adherence to Strategus R programming style.
              6. Avoid including any explanations or additional text outside of the R code.`;
  const messages = [
    {
      role: "system",
      content: {
        type: "text",
        text: instructions,
      },
    },
  ];
  return messages;
}
