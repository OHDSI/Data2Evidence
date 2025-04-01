export const config = {
    "bots": [
    // {
    //     "name": "Questionnaire Response",
    //     "id": "",
    //     "description": "FHIR to GDM Questionnaire Response",
    //     "source": "src/bots/questionnaireResponse/index.ts",
    //     "dist": "dist/questionnaireResponse/index.js",
    //     "subscriptionCriteria": "QuestionnaireResponse"
    //   },
      {
        "name": "Bundle",
        "id": "",
        "description": "Bundle bot",
        "source": "src/bots/bundle/index.ts",
        "dist": "src/bots/bundle/tar/index.js",
        "subscriptionCriteria": "Bundle"
      }
  ]
}
