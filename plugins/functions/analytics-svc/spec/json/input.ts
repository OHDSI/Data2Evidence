// tslint:disable:object-literal-key-quotes
/* tslint:disable: max-line-length */
export let input =
    [{ "patient": { "isFiltercard": true, "attributes": { "smoker": [{}], "gender": [{ "yaxis": 4, "aggregation": "string_agg", "isPLCol": true }], "biomarker": [{}], "lastName": [{ "yaxis": 1, "aggregation": "string_agg", "isPLCol": true }], "firstName": [{ "yaxis": 2, "aggregation": "string_agg", "isPLCol": true }], "dateOfBirth": [{ "yaxis": 3, "aggregation": "string_agg", "isPLCol": true }] }, "conditions": { "acme": { "interactions": { "priDiag": { "1": { "isFiltercard": true, "attributes": { "icd_10": [{ "yaxis": 6, "aggregation": "string_agg", "isPLCol": true }], "age": [{ "yaxis": 5, "aggregation": "string_agg", "isPLCol": true }] } } }, "chemo": { "1": { "attributes": { "interactionCount": [{ "yaxis": 7, "aggregation": "string_agg", "isPLCol": true }] } } } } } } }, "configData": { "configId": "PatientAnalyticsInitialCI", "configVersion": "A" }, "guarded": true, "limit": 20, "offset": 0 }];


// [{ "patient": { "isFiltercard": true, "attributes": { "smoker": [{  }], "gender": [{  }], "biomarker": [{  }], "pcount": [{ "yaxis": 1 }] }, "conditions": { "acme": { "interactions": { "priDiag": { "1": { "isFiltercard": true, "attributes": { "icd_10": [{ "xaxis": 1 }], "age": [{  }] } } } } } } }, "configData": { "configId": "PatientAnalyticsInitialCI", "configVersion": "A" }, "collection": { "title": "test0", "description": "", "guarded": true } }]

// [{"patient":{"isFiltercard":true,"attributes":{"smoker":[{}],"gender":[{"xaxis":1}],"biomarker":[{}],"yearOfBirth":[{"xaxis":3,"binsize":5}],"monthOfBirth":[{"yaxis":1}]},"conditions":{"acme":{"interactions":{"priDiag":{"1":{"isFiltercard":true,"attributes":{"icd_10":[{}],"age":[{}]}}},"radio":{"1":{"isFiltercard":true,"attributes":{"radio_dosage":[{}],"radio_ops":[{"xaxis":2}]}}}}}}},"configData":{"configId":"PatientAnalyticsInitialCI","configVersion":"A"}}]


// [{"patient":{"isFiltercard":true,"attributes":{"smoker":[{}],"gender":[{"xaxis":1}],"biomarker":[{}],"yearOfBirth":[{}],"monthOfBirth":[{}],"packYearsSmoked":[{}]},"conditions":{"acme":{"interactions":{"priDiag":{"2":{"isFiltercard":true,"attributes":{"icd_10":[{}],"age":[{"yaxis":1}],"calYear":[{"xaxis":3,"binsize":50}]}}},"radio":{"2":{"isFiltercard":true,"attributes":{"radio_dosage":[{}],"radio_ops":[{}]}}},"surgery":{"1":{"isFiltercard":true,"attributes":{"exist":[{}],"surgery_ops":[{"xaxis":2}]}}}}}}},"configData":{"configId":"PatientAnalyticsInitialCI","configVersion":"A"}}]

// [{"patient":{"isFiltercard":true,"attributes":{"smoker":[{}],"gender":[{}],"biomarker":[{}]}},"configData":{"configId":"PatientAnalyticsInitialCI","configVersion":"A"}}]

// [{"patient":{"isFiltercard":true,"attributes":{"smoker":[{}],"gender":[{}],"biomarker":[{}],"pcount":[{"yaxis":1}]},"conditions":{"acme":{"interactions":{"priDiag":{"7":{"isFiltercard":true,"attributes":{"icd_10":[{}],"age":[{}]}}}}}}},"configData":{"configId":"PatientAnalyticsInitialCI","configVersion":"A"}}]


 //[{ "patient": { "isFiltercard": true, "attributes": { "smoker": [{}], "gender": [{}], "biomarker": [{}], "pcount": [{ "yaxis": 1 }] }, "conditions": { "acme": { "interactions": { "priDiag": { "1": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C54" }, { "op": "=", "value": "C34" }], "xaxis": 1 }], "age": [{}] } } }, "chemo": { "1": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "FOLFOX" }, { "op": "=", "value": "COPP" }], "xaxis": 2 }] } } } } } } }, "configData": { "configId": "PatientAnalyticsInitialCI", "configVersion": "A" } }];
     // [{ "patient": { "isFiltercard": true, "attributes": { "smoker": [{}], "gender": [{}], "biomarker": [{}], "yearOfBirth": [{ "filter": [{ "and": [{ "op": ">=", "value": 1900 }, { "op": "<=", "value": 2016 }] }, { "op": ">", "value": 1900 }, { "op": "<", "value": 2016 }, { "and": [{ "op": ">=", "value": 1900 }, { "op": "<", "value": 2016 }] }, { "and": [{ "op": ">", "value": 1900 }, { "op": "<=", "value": 2016 }] }, { "and": [{ "op": ">", "value": 1900 }, { "op": "<", "value": 2016 }] }] }], "pcount": [{ "yaxis": 1 }] }, "conditions": { "acme": { "interactions": { "priDiag": { "1": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C54" }, { "op": "=", "value": "C34" }], "xaxis": 1 }], "age": [{}] } } }, "chemo": { "1": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "FOLFOX" }] }], "_succ": [{ "value": "patient.conditions.acme.interactions.chemo.2", "filter": [{ "and": [{ "op": ">=", "value": 1 }, { "op": "<", "value": 300 }] }] }] } }, "2": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "COPP" }] }] } }, "3": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "Cisplatin" }] }] } } } } } } }, "configData": { "configId": "PatientAnalyticsInitialCI", "configVersion": "A" } }, { "patient": { "isFiltercard": true, "attributes": { "smoker": [{}], "gender": [{}], "biomarker": [{}], "yearOfBirth": [{ "filter": [{ "and": [{ "op": ">=", "value": 1900 }, { "op": "<=", "value": 2016 }] }, { "op": ">", "value": 1900 }, { "op": "<", "value": 2016 }, { "and": [{ "op": ">=", "value": 1900 }, { "op": "<", "value": 2016 }] }, { "and": [{ "op": ">", "value": 1900 }, { "op": "<=", "value": 2016 }] }, { "and": [{ "op": ">", "value": 1900 }, { "op": "<", "value": 2016 }] }] }], "pcount": [{ "yaxis": 1 }] }, "conditions": { "acme": { "interactions": { "priDiag": { "1": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C54" }, { "op": "=", "value": "C34" }], "xaxis": 1 }], "age": [{}] } } }, "chemo": { "1": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "FOLFOX" }] }], "_succ": [{ "value": "patient.conditions.acme.interactions.chemo.2", "filter": [{ "and": [{ "op": ">=", "value": 1 }, { "op": "<", "value": 300 }] }] }] } }, "2": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "COPP" }] }] } }, "4": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "COPP" }] }] } } } } } } }, "configData": { "configId": "PatientAnalyticsInitialCI", "configVersion": "A" } }];
    //  [{ "patient": { "isFiltercard": true, "attributes": { "smoker": [{ "filter": [{ "op": "=", "value": "No" }] }], "gender": [{ "filter": [{ "op": "=", "value": "M" }] }], "biomarker": [{ "filter": [{ "op": "=", "value": "BRCA1" }, { "op": "=", "value": "EGFR" }, { "op": "=", "value": "Her2neu" }, { "op": "=", "value": "KRAS" }] }], "smokingOnset": [{ "filter": [{ "and": [{ "op": ">=", "value": 2000 }, { "op": "<=", "value": 2016 }] }] }], "pcount": [{ "yaxis": 1 }] }, "conditions": { "acme": { "interactions": { "priDiag": { "1": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C01" }], "xaxis": 1 }], "calYear": [{ "filter": [{ "and": [{ "op": ">=", "value": 2000 }, { "op": "<=", "value": 2016 }] }] }] } }, "2": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C06" }] }], "calYear": [{ "filter": [{ "and": [{ "op": ">=", "value": 1900 }, { "op": "<=", "value": 2000 }] }] }] } } }, "chemo": { "1": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "COPP" }] }] } }, "2": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "COPP" }, { "op": "=", "value": "Docetaxel / Cisplatin" }] }] } }, "4": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "Vinorelbin / Cisplatin" }] }] } }, "5": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{}] } } }, "biobank": { "1": { "isFiltercard": true, "attributes": { "status": [{ "filter": [{ "op": "=", "value": "Freigegeben" }] }], "tType": [{}] } } }, "radio": { "1": { "isFiltercard": true, "attributes": { "radio_dosage": [{}], "radio_ops": [{ "filter": [{ "op": "=", "value": "8-520" }] }] } } } } } }, "interactions": { "vStatus": { "1": { "isFiltercard": true, "attributes": { "age": [{}], "status": [{}], "year": [{ "filter": [{ "and": [{ "op": ">=", "value": 1950 }, { "op": "<=", "value": 2000 }] }] }] } } } } }, "configData": { "configId": "PatientAnalyticsInitialCI", "configVersion": "A" } }, { "patient": { "isFiltercard": true, "attributes": { "smoker": [{ "filter": [{ "op": "=", "value": "No" }] }], "gender": [{ "filter": [{ "op": "=", "value": "M" }] }], "biomarker": [{ "filter": [{ "op": "=", "value": "BRCA1" }, { "op": "=", "value": "EGFR" }, { "op": "=", "value": "Her2neu" }, { "op": "=", "value": "KRAS" }] }], "smokingOnset": [{ "filter": [{ "and": [{ "op": ">=", "value": 2000 }, { "op": "<=", "value": 2016 }] }] }], "pcount": [{ "yaxis": 1 }] }, "conditions": { "acme": { "interactions": { "priDiag": { "1": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C01" }], "xaxis": 1 }], "calYear": [{ "filter": [{ "and": [{ "op": ">=", "value": 2000 }, { "op": "<=", "value": 2016 }] }] }] } }, "2": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C06" }] }], "calYear": [{ "filter": [{ "and": [{ "op": ">=", "value": 1900 }, { "op": "<=", "value": 2000 }] }] }] } } }, "chemo": { "1": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "COPP" }] }] } }, "2": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "COPP" }, { "op": "=", "value": "Docetaxel / Cisplatin" }] }] } }, "3": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "VAMP" }] }] } }, "4": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "Vinorelbin / Cisplatin" }] }] } }, "5": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{}] } } }, "biobank": { "1": { "isFiltercard": true, "attributes": { "status": [{ "filter": [{ "op": "=", "value": "Freigegeben" }] }], "tType": [{}] } } } } } }, "interactions": { "vStatus": { "1": { "isFiltercard": true, "attributes": { "age": [{}], "status": [{}], "year": [{ "filter": [{ "and": [{ "op": ">=", "value": 1950 }, { "op": "<=", "value": 2000 }] }] }] } } } } }, "configData": { "configId": "PatientAnalyticsInitialCI", "configVersion": "A" } }, { "patient": { "isFiltercard": true, "attributes": { "smoker": [{ "filter": [{ "op": "=", "value": "No" }] }], "gender": [{ "filter": [{ "op": "=", "value": "M" }] }], "biomarker": [{ "filter": [{ "op": "=", "value": "BRCA1" }, { "op": "=", "value": "EGFR" }, { "op": "=", "value": "Her2neu" }, { "op": "=", "value": "KRAS" }] }], "smokingOnset": [{ "filter": [{ "and": [{ "op": ">=", "value": 2000 }, { "op": "<=", "value": 2016 }] }] }], "pcount": [{ "yaxis": 1 }] }, "conditions": { "acme": { "interactions": { "priDiag": { "1": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C01" }], "xaxis": 1 }], "calYear": [{ "filter": [{ "and": [{ "op": ">=", "value": 2000 }, { "op": "<=", "value": 2016 }] }] }] } }, "2": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C06" }] }], "calYear": [{ "filter": [{ "and": [{ "op": ">=", "value": 1900 }, { "op": "<=", "value": 2000 }] }] }] } }, "3": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C09" }] }], "age": [{ "filter": [{ "and": [{ "op": ">=", "value": 1800 }, { "op": "<=", "value": 1900 }] }] }] } } }, "chemo": { "1": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "COPP" }] }] } }, "2": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "COPP" }, { "op": "=", "value": "Docetaxel / Cisplatin" }] }] } }, "4": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "Vinorelbin / Cisplatin" }] }] } }, "5": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{}] } } }, "biobank": { "1": { "isFiltercard": true, "attributes": { "status": [{ "filter": [{ "op": "=", "value": "Freigegeben" }] }], "tType": [{}] } } } } } }, "interactions": { "vStatus": { "1": { "isFiltercard": true, "attributes": { "age": [{}], "status": [{}], "year": [{ "filter": [{ "and": [{ "op": ">=", "value": 1950 }, { "op": "<=", "value": 2000 }] }] }] } } } } }, "configData": { "configId": "PatientAnalyticsInitialCI", "configVersion": "A" } }, { "patient": { "isFiltercard": true, "attributes": { "smoker": [{ "filter": [{ "op": "=", "value": "No" }] }], "gender": [{ "filter": [{ "op": "=", "value": "M" }] }], "biomarker": [{ "filter": [{ "op": "=", "value": "BRCA1" }, { "op": "=", "value": "EGFR" }, { "op": "=", "value": "Her2neu" }, { "op": "=", "value": "KRAS" }] }], "smokingOnset": [{ "filter": [{ "and": [{ "op": ">=", "value": 2000 }, { "op": "<=", "value": 2016 }] }] }], "pcount": [{ "yaxis": 1 }] }, "conditions": { "acme": { "interactions": { "priDiag": { "1": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C01" }], "xaxis": 1 }], "calYear": [{ "filter": [{ "and": [{ "op": ">=", "value": 2000 }, { "op": "<=", "value": 2016 }] }] }] } }, "2": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C06" }] }], "calYear": [{ "filter": [{ "and": [{ "op": ">=", "value": 1900 }, { "op": "<=", "value": 2000 }] }] }] } } }, "chemo": { "1": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "COPP" }] }] } }, "2": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "COPP" }, { "op": "=", "value": "Docetaxel / Cisplatin" }] }] } }, "4": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "Vinorelbin / Cisplatin" }] }] } }, "5": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{}] } } }, "biobank": { "1": { "isFiltercard": true, "attributes": { "status": [{ "filter": [{ "op": "=", "value": "Freigegeben" }] }], "tType": [{}] } } }, "radio": { "2": { "isFiltercard": true, "attributes": { "radio_dosage": [{}], "radio_ops": [{ "filter": [{ "op": "=", "value": "8-521" }] }] } } } } } }, "interactions": { "vStatus": { "1": { "isFiltercard": true, "attributes": { "age": [{}], "status": [{}], "year": [{ "filter": [{ "and": [{ "op": ">=", "value": 1950 }, { "op": "<=", "value": 2000 }] }] }] } } } } }, "configData": { "configId": "PatientAnalyticsInitialCI", "configVersion": "A" } }];
         // [{ "patient": { "isFiltercard": true, "attributes": { "smoker": [{}], "gender": [{}], "biomarker": [{}], "yearOfBirth": [{ "filter": [{ "and": [{ "op": ">=", "value": 2000 }, { "op": "<=", "value": 2016 }] }, { "op": ">", "value": 2016 }] }], "pcount": [{ "yaxis": 1 }] }, "conditions": { "acme": { "interactions": { "priDiag": { "1": { "isFiltercard": true, "attributes": { "icd_10": [{ "xaxis": 1 }], "age": [{}] } } } } } } }, "configData": { "configId": "PatientAnalyticsInitialCI", "configVersion": "A" } }];
     // [{ "patient": { "isFiltercard": true, "attributes": { "smoker": [{}], "gender": [{}], "biomarker": [{}], "pcount": [{ "yaxis": 1 }] }, "conditions": { "acme": { "interactions": { "priDiag": { "1": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C00" }], "xaxis": 1 }], "age": [{}], "_succ": [{ "value": "patient.conditions.acme.interactions.priDiag.2", "filter": [{ "and": [{ "op": ">=", "value": 1 }, { "op": "<", "value": 6000 }] }] }] } }, "2": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C01" }] }], "age": [{}] } } } } } } }, "configData": { "configId": "PatientAnalyticsInitialCI", "configVersion": "A" } }];
            // [{ "patient": { "isFiltercard": true, "attributes": { "smoker": [{}], "gender": [{}], "biomarker": [{}], "pcount": [{ "yaxis": 1 }] }, "conditions": { "acme": { "interactions": { "priDiag": { "1": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C00" }, { "op": "=", "value": "C01" }, { "op": "=", "value": "C02" }, { "op": "=", "value": "C03" }], "xaxis": 1 }], "age": [{}], "calYear": [{ "filter": [{ "and": [{ "op": ">=", "value": 2000 }, { "op": "<=", "value": 2016 }] }] }] } }, "2": { "isFiltercard": true, "attributes": { "icd_10": [{ "filter": [{ "op": "=", "value": "C00" }, { "op": "=", "value": "C01" }, { "op": "=", "value": "C07" }] }], "age": [{}], "icd_9": [{ "filter": [{ "op": "=", "value": "C00" }] }] } } }, "chemo": { "1": { "isFiltercard": true, "attributes": { "chemo_ops": [{}], "chemo_prot": [{ "filter": [{ "op": "=", "value": "COPP" }, { "op": "=", "value": "FOLFOX" }] }] } } } } } } }, "configData": { "configId": "PatientAnalyticsInitialCI", "configVersion": "A" } }];

         // [
         //      {
     //           "patient": {
     //                "isFiltercard": true,
     //                "attributes": {
     //                     "smoker": [
     //                          {

     //                          }
     //                     ],
     //                     "gender": [
     //                          {

     //                          }
     //                     ],
     //                     "biomarker": [
     //                          {

     //                          }
     //                     ],
     //                     "yearOfBirth": [
     //                          {
     //                               "filter": [
     //                                    {
     //                                         "op": ">",
     //                                         "value": 1900
     //                                    },
     //                                    {
     //                                         "op": "<=",
     //                                         "value": 2000
     //                                    }
     //                               ]
     //                          }
     //                     ],
     //                     "pcount": [
     //                          {
     //                               "yaxis": 1
     //                          }
     //                     ]
     //                },
     //                "conditions": {
     //                     "acme": {
     //                          "interactions": {
     //                               "chemo": {
     //                                    "1": {
     //                                         "isFiltercard": true,
     //                                         "attributes": {
     //                                              "chemo_ops": [
     //                                                   {

     //                                                   }
     //                                              ],
     //                                              "chemo_prot": [
     //                                                   {

     //                                                   }
     //                                              ],
     //                                              "_succ": [
     //                                                   {
     //                                                        "value": "patient.conditions.acme.interactions.chemo.2",
     //                                                        "filter": [
     //                                                             {
     //                                                                  "and": [
     //                                                                       {
     //                                                                            "op": ">=",
     //                                                                            "value": 1
     //                                                                       },
     //                                                                       {
     //                                                                            "op": "<",
     //                                                                            "value": 300
     //                                                                       }
     //                                                                  ]
     //                                                             }
     //                                                        ]
     //                                                   }
     //                                              ]
     //                                         }
     //                                    },
     //                                    "2": {
     //                                         "isFiltercard": true,
     //                                         "attributes": {
     //                                              "chemo_ops": [
     //                                                   {

     //                                                   }
     //                                              ],
     //                                              "chemo_prot": [
     //                                                   {

     //                                                   }
     //                                              ]
     //                                         }
     //                                    }
     //                               },
     //                               "priDiag": {
     //                                    "1": {
     //                                         "isFiltercard": true,
     //                                         "attributes": {
     //                                              "icd_10": [
     //                                                   {
     //                                                        "xaxis": 1
     //                                                   }
     //                                              ],
     //                                              "age": [
     //                                                   {

     //                                                   }
     //                                              ]
     //                                         }
     //                                    }
     //                               }
     //                          }
     //                     }
     //                }
     //           },
     //           "configData": {
     //                "configId": "PatientAnalyticsInitialCI",
     //                "configVersion": "A"
     //           }
     //      }
     // ];


//    [
//          {
//       "patient":{
//          "isFiltercard":true,
//          "attributes":{
//             "smoker":[
//                {

//                }
//             ],
//             "gender":[
//                {

//                }
//             ],
//             "biomarker":[
//                {

//                }
//             ],
//             "monthOfBirth":[
//                {
//                   "filter":[
//                      {
//                         "and":[
//                            {
//                               "op":">=",
//                               "value":1
//                            },
//                            {
//                               "op":"<=",
//                               "value":12
//                            }
//                         ]
//                      }
//                   ]
//                }
//             ],
//             "pcount":[
//                {
//                   "yaxis":1
//                }
//             ]
//          },
//          "conditions":{
//             "acme":{
//                "interactions":{
//                   "priDiag":{
//                      "1":{
//                         "isFiltercard":true,
//                         "attributes":{
//                            "icd_10":[
//                               {
//                                  "filter":[
//                                     {
//                                        "op":"=",
//                                        "value":"C34"
//                                     }
//                                  ],
//                                  "xaxis":1
//                               }
//                            ],
//                            "age":[
//                               {

//                               }
//                            ],
//                            "_succ":[
//                               {
//                                  "value":"patient.conditions.acme.interactions.priDiag.2",
//                                  "filter":[
//                                     {
//                                        "and":[
//                                           {
//                                              "op":">=",
//                                              "value":1
//                                           }
//                                        ]
//                                     }
//                                  ]
//                               }
//                            ]
//                         }
//                      },
//                      "2":{
//                         "isFiltercard":true,
//                         "attributes":{
//                            "icd_10":[
//                               {
//                                  "filter":[
//                                     {
//                                        "op":"=",
//                                        "value":"C54"
//                                     }
//                                  ]
//                               }
//                            ],
//                            "age":[
//                               {

//                               }
//                            ]
//                         }
//                      }
//                   },
//                   "chemo":{
//                      "1":{
//                         "isFiltercard":true,
//                         "attributes":{
//                            "chemo_ops":[
//                               {

//                               }
//                            ],
//                            "chemo_prot":[
//                               {
//                                  "filter":[
//                                     {
//                                        "op":"=",
//                                        "value":"COPP"
//                                     }
//                                  ]
//                               }
//                            ],
//                            "_succ":[
//                               {
//                                  "value":"patient.conditions.acme.interactions.chemo.2",
//                                  "filter":[
//                                     {
//                                        "and":[
//                                           {
//                                              "op":">=",
//                                              "value":1
//                                           },
//                                           {
//                                              "op":"<",
//                                              "value":600
//                                           }
//                                        ]
//                                     }
//                                  ]
//                               }
//                            ]
//                         }
//                      },
//                      "2":{
//                         "isFiltercard":true,
//                         "attributes":{
//                            "chemo_ops":[
//                               {

//                               }
//                            ],
//                            "chemo_prot":[
//                               {
//                                  "filter":[
//                                     {
//                                        "op":"=",
//                                        "value":"FOLFOX"
//                                     }
//                                  ]
//                               }
//                            ]
//                         }
//                      }
//                   },
//                   "surgery":{
//                      "1":{
//                         "isFiltercard":true,
//                         "attributes":{
//                            "exist":[
//                               {

//                               }
//                            ],
//                            "surgery_ops":[
//                               {
//                                  "filter":[
//                                     {
//                                        "op":"=",
//                                        "value":"5-320"
//                                     },
//                                     {
//                                        "op":"=",
//                                        "value":"5-451"
//                                     },
//                                     {
//                                        "op":"=",
//                                        "value":"5-870"
//                                     }
//                                  ]
//                               }
//                            ]
//                         }
//                      }
//                   }
//                }
//             }
//          }
//       },
//       "configData":{
//          "configId":"PatientAnalyticsInitialCI",
//          "configVersion":"A"
//       }
//    },
//    {
//       "patient":{
//          "isFiltercard":true,
//          "attributes":{
//             "smoker":[
//                {

//                }
//             ],
//             "gender":[
//                {

//                }
//             ],
//             "biomarker":[
//                {

//                }
//             ],
//             "monthOfBirth":[
//                {
//                   "filter":[
//                      {
//                         "and":[
//                            {
//                               "op":">=",
//                               "value":1
//                            },
//                            {
//                               "op":"<=",
//                               "value":12
//                            }
//                         ]
//                      }
//                   ]
//                }
//             ],
//             "pcount":[
//                {
//                   "yaxis":1
//                }
//             ]
//          },
//          "conditions":{
//             "acme":{
//                "interactions":{
//                   "priDiag":{
//                      "1":{
//                         "isFiltercard":true,
//                         "attributes":{
//                            "icd_10":[
//                               {
//                                  "filter":[
//                                     {
//                                        "op":"=",
//                                        "value":"C34"
//                                     }
//                                  ],
//                                  "xaxis":1
//                               }
//                            ],
//                            "age":[
//                               {

//                               }
//                            ],
//                            "_succ":[
//                               {
//                                  "value":"patient.conditions.acme.interactions.priDiag.2",
//                                  "filter":[
//                                     {
//                                        "and":[
//                                           {
//                                              "op":">=",
//                                              "value":1
//                                           }
//                                        ]
//                                     }
//                                  ]
//                               }
//                            ]
//                         }
//                      },
//                      "2":{
//                         "isFiltercard":true,
//                         "attributes":{
//                            "icd_10":[
//                               {
//                                  "filter":[
//                                     {
//                                        "op":"=",
//                                        "value":"C54"
//                                     }
//                                  ]
//                               }
//                            ],
//                            "age":[
//                               {

//                               }
//                            ]
//                         }
//                      }
//                   },
//                   "chemo":{
//                      "1":{
//                         "isFiltercard":true,
//                         "attributes":{
//                            "chemo_ops":[
//                               {

//                               }
//                            ],
//                            "chemo_prot":[
//                               {
//                                  "filter":[
//                                     {
//                                        "op":"=",
//                                        "value":"COPP"
//                                     }
//                                  ]
//                               }
//                            ],
//                            "_succ":[
//                               {
//                                  "value":"patient.conditions.acme.interactions.chemo.2",
//                                  "filter":[
//                                     {
//                                        "and":[
//                                           {
//                                              "op":">=",
//                                              "value":1
//                                           },
//                                           {
//                                              "op":"<",
//                                              "value":600
//                                           }
//                                        ]
//                                     }
//                                  ]
//                               }
//                            ]
//                         }
//                      },
//                      "2":{
//                         "isFiltercard":true,
//                         "attributes":{
//                            "chemo_ops":[
//                               {

//                               }
//                            ],
//                            "chemo_prot":[
//                               {
//                                  "filter":[
//                                     {
//                                        "op":"=",
//                                        "value":"FOLFOX"
//                                     }
//                                  ]
//                               }
//                            ]
//                         }
//                      }
//                   },
//                   "surgery":{
//                      "2":{
//                         "isFiltercard":true,
//                         "attributes":{
//                            "exist":[
//                               {

//                               }
//                            ],
//                            "surgery_ops":[
//                               {
//                                  "filter":[
//                                     {
//                                        "op":"=",
//                                        "value":"5-320"
//                                     },
//                                     {
//                                        "op":"=",
//                                        "value":"5-451"
//                                     },
//                                     {
//                                        "op":"=",
//                                        "value":"5-870"
//                                     }
//                                  ]
//                               }
//                            ]
//                         }
//                      }
//                   }
//                }
//             }
//          }
//       },
//       "configData":{
//          "configId":"PatientAnalyticsInitialCI",
//          "configVersion":"A"
//       }
//    }
// ];
