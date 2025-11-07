export const INVALID_CONFIG = {
  patient: {
    conditions: {
      acme: {
        interactions: {
          priDiag: {
            name: [
              {
                lang: "",
                value: "Primary Tumor Diagnosis",
              },
              {
                lang: "en",
                value: "Primary Tumor Diagnosis",
              },
              {
                lang: "de",
                value: "Primärtumor-Diagnose",
              },
              {
                lang: "fr",
                value: "Diagnostic Primaire",
              },
            ],
            disabledLangName: [],
            defaultFilter: "@INTERACTION.\"InteractionTypeValue\"='ACME_M03'",
            defaultFilterKey: "ACME_M03",
            order: 4,
            parentInteraction: [],
            parentInteractionLabel: "parent",
            attributes: {
              icd_10: {
                name: [
                  {
                    lang: "",
                    value: "ICD-10-CM Code",
                  },
                  {
                    lang: "en",
                    value: "ICD-10-CM Code",
                  },
                  {
                    lang: "de",
                    value: "ICD-10-CM-Code",
                  },
                  {
                    lang: "fr",
                    value: "Code CIM-10",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: "LEFT(@CODE.VALUE,3)",
                defaultFilter: "@CODE.ATTRIBUTE = 'ICD_10'",
                referenceFilter:
                  "@REF.VOCABULARY_ID = 'ots.ICD.ICD10GM' AND (LENGTH(@REF.CODE)=3 OR (LENGTH(@REF.CODE)=5 AND @REF.CODE LIKE '%.-'))",
                referenceExpression: "LEFT(@REF.CODE,3)",
                order: 1,
              },
              icd_9: {
                name: [
                  {
                    lang: "",
                    value: "ICD-9-CM Code",
                  },
                  {
                    lang: "en",
                    value: "ICD-9-CM Code",
                  },
                  {
                    lang: "de",
                    value: "ICD-9-CM-Code",
                  },
                  {
                    lang: "fr",
                    value: "Code CIM-9",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: "LEFT(@CODE.VALUE,3)",
                defaultFilter: "@CODE.ATTRIBUTE = 'ICD_9'",
                order: 2,
              },
              age: {
                name: [
                  {
                    lang: "",
                    value: "Age at Diagnosis",
                  },
                  {
                    lang: "en",
                    value: "Age at Diagnosis",
                  },
                  {
                    lang: "de",
                    value: "Alter bei Diagnose",
                  },
                  {
                    lang: "fr",
                    value: "Age au Diagnostic",
                  },
                ],
                disabledLangName: [],
                type: "num",
                expression:
                  'FLOOR(DAYS_BETWEEN(@PATIENT.DOB,@INTERACTION."END") / 365)',
                defaultFilter: '@PATIENT.DOB <= @INTERACTION."END"',
                order: 3,
              },
              nsclc: {
                name: [
                  {
                    lang: "",
                    value: "Lung Cancer Subtype",
                  },
                  {
                    lang: "en",
                    value: "Lung Cancer Subtype",
                  },
                  {
                    lang: "de",
                    value: "Lungenkrebs Subtyp",
                  },
                  {
                    lang: "fr",
                    value: "Type de Cancer Pulmonaire",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: '@CODE."Value"',
                eavExpressionKey: "LC_TYPE",
                defaultFilter: "@CODE.\"AttributeValue\"='LC_TYPE'",
                order: 4,
              },
              freetextDiag: {
                name: [
                  {
                    lang: "",
                    value: "Diagnosis Free Text",
                  },
                  {
                    lang: "en",
                    value: "Diagnosis Free Text",
                  },
                  {
                    lang: "de",
                    value: "Diagnose-Freitext",
                  },
                  {
                    lang: "fr",
                    value: "Texte Libre au Diagnostic",
                  },
                ],
                disabledLangName: [],
                type: "freetext",
                expression: "@TEXT.VALUE",
                defaultFilter: "@TEXT.ATTRIBUTE = 'INTERACTIONS_FREETEXT'",
                order: 5,
                fuzziness: 0.8,
              },
              histology: {
                name: [
                  {
                    lang: "",
                    value: "Histology",
                  },
                  {
                    lang: "en",
                    value: "Histology",
                  },
                  {
                    lang: "de",
                    value: "Histologie",
                  },
                  {
                    lang: "fr",
                    value: "Histologie",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: '@CODE."Value"',
                eavExpressionKey: "Histology",
                defaultFilter: "@CODE.\"AttributeValue\"='Histology'",
                order: 6,
              },
              tcgaCode: {
                name: [
                  {
                    lang: "",
                    value: "Cancer Abbreviation",
                  },
                  {
                    lang: "en",
                    value: "Cancer Abbreviation",
                  },
                  {
                    lang: "de",
                    value: "Krebskürzel",
                  },
                  {
                    lang: "fr",
                    value: "Abréviation de Cancer",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: '@CODE."Value"',
                eavExpressionKey: "TCGA_CODE",
                defaultFilter: "@CODE.\"AttributeValue\"='TCGA_CODE'",
                order: 7,
              },
              tcgaCancer: {
                name: [
                  {
                    lang: "",
                    value: "Cancer Type",
                  },
                  {
                    lang: "en",
                    value: "Cancer Type",
                  },
                  {
                    lang: "de",
                    value: "Krebstyp",
                  },
                  {
                    lang: "fr",
                    value: "Type de Cancer",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: '@CODE."Value"',
                eavExpressionKey: "TCGA_CANCER",
                defaultFilter: "@CODE.\"AttributeValue\"='TCGA_CANCER'",
                order: 8,
              },
            },
          },
          biobank: {
            name: [
              {
                lang: "",
                value: "Biobank",
              },
              {
                lang: "en",
                value: "Biobank",
              },
              {
                lang: "de",
                value: "Bio-Bank",
              },
              {
                lang: "fr",
                value: "Biobanque",
              },
            ],
            disabledLangName: [],
            defaultFilter: "@INTERACTION.\"InteractionTypeValue\"='BIOBANK'",
            defaultFilterKey: "BIOBANK",
            order: 5,
            parentInteraction: [],
            parentInteractionLabel: "parent",
            attributes: {
              status: {
                name: [
                  {
                    lang: "",
                    value: "Sample Status",
                  },
                  {
                    lang: "en",
                    value: "Sample Status",
                  },
                  {
                    lang: "de",
                    value: "Musterstatus",
                  },
                  {
                    lang: "fr",
                    value: "Etat de l'Echantillon",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: "@CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'BIOBANK_STATUS'",
                order: 1,
              },
              tType: {
                name: [
                  {
                    lang: "",
                    value: "Tissue / Liquid Type",
                  },
                  {
                    lang: "en",
                    value: "Tissue / Liquid Type",
                  },
                  {
                    lang: "de",
                    value: "Gewebe-/Flüssigkeitstyp",
                  },
                  {
                    lang: "fr",
                    value: "Type de Tissu/Liquide",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: "@CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'BIOBANK_TYPE'",
                order: 2,
              },
            },
          },
          chemo: {
            name: [
              {
                lang: "",
                value: "Chemotherapy",
              },
              {
                lang: "en",
                value: "Chemotherapy",
              },
              {
                lang: "de",
                value: "Chemotherapie",
              },
              {
                lang: "fr",
                value: "Chimiothérapie",
              },
            ],
            disabledLangName: [],
            defaultFilter:
              "@INTERACTION.\"InteractionTypeValue\"='ACME_M07_CHEMO'",
            defaultFilterKey: "ACME_M07_CHEMO",
            order: 6,
            parentInteraction: ["patient.conditions.acme.interactions.priDiag"],
            parentInteractionLabel: "parent",
            attributes: {
              interactionCount: {
                name: [
                  {
                    lang: "",
                    value: "Interaction Count",
                  },
                  {
                    lang: "en",
                    value: "Interaction Count",
                  },
                  {
                    lang: "de",
                    value: "Anzahl der Interaktionen",
                  },
                  {
                    lang: "fr",
                    value: "Nombre d'Interactions",
                  },
                ],
                disabledLangName: [],
                type: "num",
                measureExpression:
                  "COUNT(DISTINCT(@INTERACTION.INTERACTION_ID))",
                order: 1,
              },
              chemo_ops: {
                name: [
                  {
                    lang: "",
                    value: "OPS Code",
                  },
                  {
                    lang: "en",
                    value: "OPS Code",
                  },
                  {
                    lang: "de",
                    value: "OPS-Code",
                  },
                  {
                    lang: "fr",
                    value: "Code OPS",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: "@CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'CHEMO_OPS'",
                order: 2,
              },
              chemo_prot: {
                name: [
                  {
                    lang: "",
                    value: "Protocol",
                  },
                  {
                    lang: "en",
                    value: "Protocol",
                  },
                  {
                    lang: "de",
                    value: "Protokoll",
                  },
                  {
                    lang: "fr",
                    value: "Protocole",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: "@CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'CHEMO_PROT'",
                order: 3,
              },
              interactionsPerPatient: {
                name: [
                  {
                    lang: "",
                    value: "Interactions per Patient",
                  },
                  {
                    lang: "en",
                    value: "Interactions per Patient",
                  },
                  {
                    lang: "de",
                    value: "Interaktionen pro Patient",
                  },
                  {
                    lang: "fr",
                    value: "Nb d'Interactions par Patient",
                  },
                ],
                disabledLangName: [],
                type: "num",
                measureExpression:
                  "COUNT(DISTINCT(@INTERACTION.INTERACTION_ID)) / COUNT(DISTINCT(@PATIENT.PATIENT_ID))",
                order: 4,
              },
            },
          },
          radio: {
            name: [
              {
                lang: "",
                value: "Radiotherapy",
              },
              {
                lang: "en",
                value: "Radiotherapy",
              },
              {
                lang: "de",
                value: "Röntgentherapie",
              },
              {
                lang: "fr",
                value: "Radiothérapie",
              },
            ],
            disabledLangName: [],
            defaultFilter:
              "@INTERACTION.\"InteractionTypeValue\"='ACME_M07_RADIO'",
            defaultFilterKey: "ACME_M07_RADIO",
            order: 7,
            parentInteraction: [],
            parentInteractionLabel: "parent",
            attributes: {
              radio_dosage: {
                name: [
                  {
                    lang: "",
                    value: "Radio Dosage (Gy)",
                  },
                  {
                    lang: "en",
                    value: "Radio Dosage (Gy)",
                  },
                  {
                    lang: "de",
                    value: "Strahlendosis (Gy)",
                  },
                  {
                    lang: "fr",
                    value: "Dose de Rayonnement (Gy)",
                  },
                ],
                disabledLangName: [],
                type: "num",
                expression: "@MEASURE.VALUE",
                defaultFilter:
                  "@MEASURE.ATTRIBUTE = 'DOSAGE' AND @MEASURE.UNIT = 'Gy'",
                order: 1,
              },
              radio_ops: {
                name: [
                  {
                    lang: "",
                    value: "OPS Code",
                  },
                  {
                    lang: "en",
                    value: "OPS Code",
                  },
                  {
                    lang: "de",
                    value: "OPS-Code",
                  },
                  {
                    lang: "fr",
                    value: "Code OPS",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: "@CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'RADIO_OPS'",
                order: 2,
              },
            },
          },
          surgery: {
            name: [
              {
                lang: "",
                value: "Surgery",
              },
              {
                lang: "en",
                value: "Surgery",
              },
              {
                lang: "de",
                value: "Operation",
              },
              {
                lang: "fr",
                value: "Opération chirurgicale",
              },
            ],
            disabledLangName: [],
            defaultFilter:
              "@INTERACTION.\"InteractionTypeValue\"='ACME_M07_SURGERY'",
            defaultFilterKey: "ACME_M07_SURGERY",
            order: 8,
            parentInteraction: [],
            parentInteractionLabel: "parent",
            attributes: {
              exist: {
                name: [
                  {
                    lang: "",
                    value: "Exist",
                  },
                  {
                    lang: "en",
                    value: "Exist",
                  },
                  {
                    lang: "de",
                    value: "Existiert",
                  },
                  {
                    lang: "fr",
                    value: "Existe",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression:
                  "CASE WHEN @INTERACTION.INTERACTION_ID IS NULL THEN NULL ELSE 'YES' END",
                order: 1,
              },
              surgery_ops: {
                name: [
                  {
                    lang: "",
                    value: "OPS Code",
                  },
                  {
                    lang: "en",
                    value: "OPS Code",
                  },
                  {
                    lang: "de",
                    value: "OPS-Code",
                  },
                  {
                    lang: "fr",
                    value: "Code OPS",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: "@CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'SURGERY_OPS'",
                order: 2,
              },
            },
          },
          tnm: {
            name: [
              {
                lang: "",
                value: "TNM Classification",
              },
              {
                lang: "en",
                value: "TNM Classification",
              },
              {
                lang: "de",
                value: "TNM-Klassifizierung",
              },
              {
                lang: "fr",
                value: "Classification TNM",
              },
            ],
            disabledLangName: [],
            defaultFilter: "@INTERACTION.\"InteractionTypeValue\"='ACME_M03TS'",
            defaultFilterKey: "ACME_M03TS",
            order: 9,
            parentInteraction: [],
            parentInteractionLabel: "parent",
            attributes: {
              tnmM: {
                name: [
                  {
                    lang: "",
                    value: "M-Component",
                  },
                  {
                    lang: "en",
                    value: "M-Component",
                  },
                  {
                    lang: "de",
                    value: "M-Kategorie",
                  },
                  {
                    lang: "fr",
                    value: "Critère M",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: "'M' || @CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'TNM_M'",
                order: 1,
              },
              tnmN: {
                name: [
                  {
                    lang: "",
                    value: "N-Component",
                  },
                  {
                    lang: "en",
                    value: "N-Component",
                  },
                  {
                    lang: "de",
                    value: "N-Kategorie",
                  },
                  {
                    lang: "fr",
                    value: "Critère N",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: "'N' || @CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'TNM_N'",
                order: 2,
              },
              tnmT: {
                name: [
                  {
                    lang: "",
                    value: "T-Component",
                  },
                  {
                    lang: "en",
                    value: "T-Component",
                  },
                  {
                    lang: "de",
                    value: "T-Kategorie",
                  },
                  {
                    lang: "fr",
                    value: "Critère T",
                  },
                ],
                disabledLangName: [],
                type: "text",
                expression: "'T' || @CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'TNM_T'",
                order: 3,
              },
            },
          },
        },
        name: "acme",
      },
    },
    interactions: {
      vStatus: {
        name: [
          {
            lang: "",
            value: "Vital Status",
          },
          {
            lang: "en",
            value: "Vital Status",
          },
          {
            lang: "de",
            value: "Vitalstatus",
          },
          {
            lang: "fr",
            value: "Statut Vital",
          },
        ],
        disabledLangName: [],
        defaultFilter: "@INTERACTION.\"InteractionTypeValue\"='ACME_M16'",
        defaultFilterKey: "ACME_M16",
        order: 3,
        parentInteraction: [],
        parentInteractionLabel: "parent",
        attributes: {
          age: {
            name: [
              {
                lang: "",
                value: "Age at Last Contact",
              },
              {
                lang: "en",
                value: "Age at Last Contact",
              },
              {
                lang: "de",
                value: "Alter beim letzten Kontakt",
              },
              {
                lang: "fr",
                value: "Age au Dernier Contact",
              },
            ],
            disabledLangName: [],
            type: "num",
            expression:
              'FLOOR(DAYS_BETWEEN(@PATIENT.DOB,@INTERACTION."END") / 365)',
            defaultFilter: '@PATIENT.DOB <= @INTERACTION."END"',
            order: 0,
          },
          status: {
            name: [
              {
                lang: "",
                value: "Vital Status",
              },
              {
                lang: "en",
                value: "Vital Status",
              },
              {
                lang: "de",
                value: "Vitalstatus",
              },
              {
                lang: "fr",
                value: "Statut Vital",
              },
            ],
            disabledLangName: [],
            type: "text",
            expression: "@CODE.VALUE",
            defaultFilter: "@CODE.ATTRIBUTE = 'VITALSTATUS'",
            order: 1,
          },
          year: {
            name: [
              {
                lang: "",
                value: "Year of Last Contact",
              },
              {
                lang: "en",
                value: "Year of Last Contact",
              },
              {
                lang: "de",
                value: "Jahr beim letzten Kontakt",
              },
              {
                lang: "fr",
                value: "Année du Dernier Contact",
              },
            ],
            disabledLangName: [],
            type: "num",
            expression: 'YEAR(@INTERACTION."START")',
            order: 2,
          },
        },
      },
      ga_sample: {
        name: [
          {
            lang: "",
            value: "Genome Sequencing",
          },
          {
            lang: "en",
            value: "Genome Sequencing",
          },
          {
            lang: "de",
            value: "Genomsequenzierung",
          },
          {
            lang: "fr",
            value: "Séquençage de l'ADN",
          },
        ],
        disabledLangName: [],
        defaultFilter: "@INTERACTION.\"InteractionTypeValue\"='Genomic'",
        defaultFilterKey: "Genomic",
        order: 1,
        parentInteraction: [],
        parentInteractionLabel: "parent",
        attributes: {
          sample_id: {
            name: [
              {
                lang: "",
                value: "Sample Id",
              },
              {
                lang: "en",
                value: "Sample Id",
              },
              {
                lang: "de",
                value: "Sample-Id",
              },
              {
                lang: "fr",
                value: "ID de l'échantillon",
              },
            ],
            disabledLangName: [],
            type: "text",
            expression: '@CODE."Value"',
            eavExpressionKey: "SampleIndex",
            defaultFilter: "@CODE.\"AttributeValue\"='SampleIndex'",
            order: 1,
            annotations: ["genomics_sample_id"],
          },
          reference_id: {
            name: [
              {
                lang: "",
                value: "Genome Reference",
              },
              {
                lang: "en",
                value: "Genome Reference",
              },
              {
                lang: "de",
                value: "Genomreferenz",
              },
              {
                lang: "fr",
                value: "Génome de Référence",
              },
            ],
            disabledLangName: [],
            type: "text",
            expression: '@CODE."Value"',
            eavExpressionKey: "ReferenceGenome",
            defaultFilter: "@CODE.\"AttributeValue\"='ReferenceGenome'",
            order: 2,
          },
          sample_class: {
            name: [
              {
                lang: "",
                value: "Sample Class",
              },
              {
                lang: "en",
                value: "Sample Class",
              },
              {
                lang: "de",
                value: "Sample-Klasse",
              },
              {
                lang: "fr",
                value: "Type d'Echantillon",
              },
            ],
            disabledLangName: [],
            type: "text",
            expression: '@CODE."Value"',
            eavExpressionKey: "SampleClass",
            defaultFilter: "@CODE.\"AttributeValue\"='SampleClass'",
            order: 3,
          },
        },
      },
      ga_mutation: {
        name: [
          {
            lang: "",
            value: "Genetic Variant",
          },
          {
            lang: "en",
            value: "Genetic Variant",
          },
          {
            lang: "de",
            value: "Genvariante",
          },
          {
            lang: "fr",
            value: "Variante Génétique",
          },
        ],
        disabledLangName: [],
        defaultFilter: "1=1",
        order: 2,
        from: {
          "@INTERACTION":
            '"CDMDEFAULT"."legacy.genomics.db.models::MRI.VariantInteractions"',
        },
        parentInteraction: [],
        parentInteractionLabel: "parent",
        attributes: {
          location: {
            name: [
              {
                lang: "",
                value: "Location",
              },
              {
                lang: "en",
                value: "Location",
              },
              {
                lang: "de",
                value: "Lokation",
              },
              {
                lang: "fr",
                value: "Emplacement",
              },
            ],
            disabledLangName: [],
            type: "num",
            expression: '@INTERACTION."POSITION_START"',
            relationExpressionKey: "POSITION_START",
            order: 1,
            annotations: ["genomics_variant_location"],
          },
          gene: {
            name: [
              {
                lang: "",
                value: "Gene",
              },
              {
                lang: "en",
                value: "Gene",
              },
              {
                lang: "de",
                value: "Gen",
              },
              {
                lang: "fr",
                value: "Gène",
              },
            ],
            disabledLangName: [],
            type: "text",
            expression: '@INTERACTION."GENE_NAME"',
            relationExpressionKey: "GENE_NAME",
            order: 2,
          },
          region: {
            name: [
              {
                lang: "",
                value: "Region",
              },
              {
                lang: "en",
                value: "Region",
              },
              {
                lang: "de",
                value: "Region",
              },
              {
                lang: "fr",
                value: "Région",
              },
            ],
            disabledLangName: [],
            type: "text",
            expression: '@INTERACTION."REGION"',
            relationExpressionKey: "REGION",
            order: 3,
          },
          variant_type: {
            name: [
              {
                lang: "",
                value: "Variant Type",
              },
              {
                lang: "en",
                value: "Variant Type",
              },
              {
                lang: "de",
                value: "Variantentyp",
              },
              {
                lang: "fr",
                value: "Type de Variante",
              },
            ],
            disabledLangName: [],
            type: "text",
            expression: '@INTERACTION."VARIANT_TYPE"',
            relationExpressionKey: "VARIANT_TYPE",
            order: 4,
          },
          seq_alteration: {
            name: [
              {
                lang: "",
                value: "Sequence Alteration",
              },
              {
                lang: "en",
                value: "Sequence Alteration",
              },
              {
                lang: "de",
                value: "Sequenzveränderung",
              },
              {
                lang: "fr",
                value: "Altération de Séquence",
              },
            ],
            disabledLangName: [],
            type: "text",
            expression: '@INTERACTION."SEQUENCE_ALTERATION"',
            relationExpressionKey: "SEQUENCE_ALTERATION",
            order: 5,
          },
          aa_ref: {
            name: [
              {
                lang: "",
                value: "Amino Acid Reference",
              },
              {
                lang: "en",
                value: "Amino Acid Reference",
              },
              {
                lang: "de",
                value: "Aminosäure Referenz",
              },
              {
                lang: "fr",
                value: "Acide Aminé de Référence",
              },
            ],
            disabledLangName: [],
            type: "text",
            expression: '@INTERACTION."AA_REF"',
            relationExpressionKey: "AA_REF",
            order: 6,
          },
          aa_alt: {
            name: [
              {
                lang: "",
                value: "Amino Acid",
              },
              {
                lang: "en",
                value: "Amino Acid",
              },
              {
                lang: "de",
                value: "Aminosäure",
              },
              {
                lang: "fr",
                value: "Acide Aminé",
              },
            ],
            disabledLangName: [],
            type: "text",
            expression: '@INTERACTION."AA_ALT"',
            relationExpressionKey: "AA_ALT",
            order: 7,
          },
        },
      },
      Medication_Administered: {
        name: [
          {
            lang: "",
            value: "Medication, Administered",
          },
        ],
        disabledLangName: [
          {
            lang: "en",
            value: "",
            visible: true,
          },
          {
            lang: "de",
            value: "",
            visible: true,
          },
          {
            lang: "fr",
            value: "",
            visible: true,
          },
        ],
        defaultFilter:
          "@INTERACTION.INTERACTION_TYPE = 'Medication, Administered'",
        order: 1,
        parentInteraction: [],
        parentInteractionLabel: "parent",
        attributes: {
          Dosage: {
            name: [
              {
                lang: "",
                value: "Dosage",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
              },
              {
                lang: "de",
                value: "",
              },
              {
                lang: "fr",
                value: "",
              },
            ],
            type: "num",
            expression: "@MEASURE.VALUE",
            defaultFilter: "@MEASURE.ATTRIBUTE = 'Dosage'",
            order: 0,
          },
          Drug_ID: {
            name: [
              {
                lang: "",
                value: "Drug ID",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
              },
              {
                lang: "de",
                value: "",
              },
              {
                lang: "fr",
                value: "",
              },
            ],
            type: "text",
            expression: "@CODE.VALUE",
            defaultFilter: "@CODE.ATTRIBUTE = 'Drug ID'",
            order: 1,
          },
          Unit: {
            name: [
              {
                lang: "",
                value: "Unit",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
              },
              {
                lang: "de",
                value: "",
              },
              {
                lang: "fr",
                value: "",
              },
            ],
            type: "text",
            expression: "@MEASURE.UNIT",
            defaultFilter: "@MEASURE.ATTRIBUTE = 'Dosage'",
            order: 2,
          },
        },
      },
      Weight_Measurement: {
        name: [
          {
            lang: "",
            value: "Weight Measurement",
          },
          {
            lang: "en",
            value: "Weight Measurement",
          },
          {
            lang: "de",
            value: "Gewichtsmessung",
          },
          {
            lang: "fr",
            value: "Mesure du Poids",
          },
        ],
        disabledLangName: [],
        defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'Weight Measurement'",
        order: 0,
        parentInteraction: [],
        parentInteractionLabel: "parent",
        attributes: {
          Weight: {
            name: [
              {
                lang: "",
                value: "Weight",
              },
              {
                lang: "en",
                value: "Weight",
              },
              {
                lang: "de",
                value: "Gewicht",
              },
              {
                lang: "fr",
                value: "Poids",
              },
            ],
            disabledLangName: [],
            type: "num",
            expression: "ROUND(@MEASURE.VALUE,1)",
            defaultFilter: "@MEASURE.ATTRIBUTE = 'Weight'",
            order: 0,
          },
        },
      },
    },
    attributes: {
      pid: {
        name: [
          {
            lang: "",
            value: "Patient ID",
          },
          {
            lang: "en",
            value: "Patient ID",
          },
          {
            lang: "de",
            value: "Patienten-ID",
          },
          {
            lang: "fr",
            value: "ID du Patient",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@PATIENT.PATIENT_ID",
        order: 1,
      },
      smoker: {
        name: [
          {
            lang: "",
            value: "Smoker",
          },
          {
            lang: "en",
            value: "Smoker",
          },
          {
            lang: "de",
            value: "Raucher",
          },
          {
            lang: "fr",
            value: "Fumeur",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@OBS.OBS_CHAR_VAL",
        defaultFilter: "@OBS.OBS_TYPE = 'SMOKER'",
        referenceFilter: "@REF.VOCABULARY_ID='mri.CAT.YES-NO'",
        referenceExpression: "@REF.CODE",
        order: 2,
      },
      pcount: {
        name: [
          {
            lang: "",
            value: "Patient Count",
          },
          {
            lang: "en",
            value: "Patient Count",
          },
          {
            lang: "de",
            value: "Patientenanzahl",
          },
          {
            lang: "fr",
            value: "Nombre de Patients",
          },
        ],
        disabledLangName: [],
        type: "num",
        measureExpression: "COUNT(DISTINCT(@PATIENT.PATIENT_ID))",
        order: 3,
      },
      nationality: {
        name: [
          {
            lang: "",
            value: "Nationality",
          },
          {
            lang: "en",
            value: "Nationality",
          },
          {
            lang: "de",
            value: "Staatsangehörigkeit",
          },
          {
            lang: "fr",
            value: "Nationalité",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@PATIENT.NATIONALITY",
        order: 4,
      },
      cohort: {
        name: [
          {
            lang: "",
            value: "Cohort",
          },
          {
            lang: "en",
            value: "Cohort",
          },
          {
            lang: "de",
            value: "Kohorte",
          },
          {
            lang: "fr",
            value: "Cohorte",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@OBS.OBS_CHAR_VAL",
        defaultFilter: "@OBS.OBS_CHAR_VAL=@OBS.OBS_CHAR_VAL",
        order: 5,
        from: {
          "@OBS": '"CDMDEFAULT"."pa.db::CollectionsAsObservation"',
        },
      },
      firstName: {
        name: [
          {
            lang: "",
            value: "First name",
          },
          {
            lang: "en",
            value: "First Name",
          },
          {
            lang: "de",
            value: "Vorname",
          },
          {
            lang: "fr",
            value: "Prénom",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@PATIENT.FIRSTNAME",
        order: 6,
      },
      lastName: {
        name: [
          {
            lang: "",
            value: "Last name",
          },
          {
            lang: "en",
            value: "Last Name",
          },
          {
            lang: "de",
            value: "Nachname",
          },
          {
            lang: "fr",
            value: "Nom",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@PATIENT.LASTNAME",
        order: 7,
      },
      street: {
        name: [
          {
            lang: "",
            value: "Street",
          },
          {
            lang: "en",
            value: "Street",
          },
          {
            lang: "de",
            value: "Strasse",
          },
          {
            lang: "fr",
            value: "Rue",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@PATIENT.STREET",
        order: 8,
      },
      city: {
        name: [
          {
            lang: "",
            value: "City",
          },
          {
            lang: "en",
            value: "City",
          },
          {
            lang: "de",
            value: "Stadt",
          },
          {
            lang: "fr",
            value: "Ville",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@PATIENT.CITY",
        order: 9,
      },
      zipcode: {
        name: [
          {
            lang: "",
            value: "ZIP Code",
          },
          {
            lang: "en",
            value: "ZIP Code",
          },
          {
            lang: "de",
            value: "PLZ",
          },
          {
            lang: "fr",
            value: "Code Postal",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@PATIENT.POSTCODE",
        order: 10,
      },
      region: {
        name: [
          {
            lang: "",
            value: "Region",
          },
          {
            lang: "en",
            value: "Region",
          },
          {
            lang: "de",
            value: "Region",
          },
          {
            lang: "fr",
            value: "Région",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@PATIENT.REGION",
        order: 11,
      },
      country: {
        name: [
          {
            lang: "",
            value: "Country",
          },
          {
            lang: "en",
            value: "Country",
          },
          {
            lang: "de",
            value: "Land",
          },
          {
            lang: "fr",
            value: "Pays",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@PATIENT.COUNTRY",
        order: 12,
      },
      gender: {
        name: [
          {
            lang: "",
            value: "Gender",
          },
          {
            lang: "en",
            value: "Gender",
          },
          {
            lang: "de",
            value: "Geschlecht",
          },
          {
            lang: "fr",
            value: "Sexe",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@PATIENT.GENDER",
        referenceFilter: "@REF.VOCABULARY_ID='mri.CAT.GENDER'",
        referenceExpression: "@REF.Code",
        order: 13,
      },
      monthOfBirth: {
        name: [
          {
            lang: "",
            value: "Month of Birth",
          },
          {
            lang: "en",
            value: "Month of Birth",
          },
          {
            lang: "de",
            value: "Geburtsmonat",
          },
          {
            lang: "fr",
            value: "Mois de Naissance",
          },
        ],
        disabledLangName: [],
        type: "num",
        expression: "MONTH(@PATIENT.DOB)",
        order: 14,
      },
      yearOfBirth: {
        name: [
          {
            lang: "",
            value: "Year of Birth",
          },
          {
            lang: "en",
            value: "Year of Birth",
          },
          {
            lang: "de",
            value: "Geburtsjahr",
          },
          {
            lang: "fr",
            value: "Année de Naissance",
          },
        ],
        disabledLangName: [],
        type: "num",
        expression: "YEAR(@PATIENT.DOB)",
        order: 15,
      },
      dateOfBirth: {
        name: [
          {
            lang: "",
            value: "Date of Birth",
          },
          {
            lang: "en",
            value: "Date of Birth",
          },
          {
            lang: "de",
            value: "Geburtsdatum",
          },
          {
            lang: "fr",
            value: "Date de Naissance",
          },
        ],
        disabledLangName: [],
        type: "time",
        expression: "@PATIENT.DOB",
        order: 16,
      },
      dateOfDeath: {
        name: [
          {
            lang: "",
            value: "Date of Death",
          },
          {
            lang: "en",
            value: "Date of Death",
          },
          {
            lang: "de",
            value: "Todesdatum",
          },
          {
            lang: "fr",
            value: "Date du Décès",
          },
        ],
        disabledLangName: [],
        type: "time",
        expression: "@PATIENT.DOD",
        order: 17,
      },
      maritalStatus: {
        name: [
          {
            lang: "",
            value: "Marital Status",
          },
          {
            lang: "en",
            value: "Marital Status",
          },
          {
            lang: "de",
            value: "Familienstand",
          },
          {
            lang: "fr",
            value: "Etat Matrimonial",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@PATIENT.MARITAL_STATUS",
        order: 18,
      },
      title: {
        name: [
          {
            lang: "",
            value: "Title",
          },
          {
            lang: "en",
            value: "Title",
          },
          {
            lang: "de",
            value: "Titel",
          },
          {
            lang: "fr",
            value: "Titre",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@PATIENT.TITLE",
        order: 19,
      },
      biomarker: {
        name: [
          {
            lang: "",
            value: "Biomarker Type",
          },
          {
            lang: "en",
            value: "Biomarker Type",
          },
          {
            lang: "de",
            value: "Biomarkertyp",
          },
          {
            lang: "fr",
            value: "Biomarqueur",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@OBS.OBS_CHAR_VAL",
        defaultFilter: "@OBS.OBS_TYPE = 'BIOMARKER'",
        order: 20,
      },
      packYearsSmoked: {
        name: [
          {
            lang: "",
            value: "Pack-Years Smoked",
          },
          {
            lang: "en",
            value: "Pack-Years Smoked",
          },
          {
            lang: "de",
            value: "Gerauchte Packungsjahre",
          },
          {
            lang: "fr",
            value: "Tabac consommé (Paquet-année)",
          },
        ],
        disabledLangName: [],
        type: "num",
        expression: "@OBS.OBS_NUM_VAL",
        defaultFilter: "@OBS.OBS_TYPE = 'PACK_YEARS_SMOKED'",
        order: 21,
      },
      smokingOnset: {
        name: [
          {
            lang: "",
            value: "Smoking Onset Year",
          },
          {
            lang: "en",
            value: "Smoking Onset Year",
          },
          {
            lang: "de",
            value: "Rauchbeginn",
          },
          {
            lang: "fr",
            value: "Année Début Consommation Tabac",
          },
        ],
        disabledLangName: [],
        type: "num",
        expression: "@OBS.OBS_NUM_VAL",
        defaultFilter: "@OBS.OBS_TYPE = 'SMOKING_ONSET'",
        order: 22,
      },
      smokingOnsetAge: {
        name: [
          {
            lang: "",
            value: "Smoking Onset Age",
          },
          {
            lang: "en",
            value: "Smoking Onset Age",
          },
          {
            lang: "de",
            value: "Alter bei Rauchbeginn",
          },
          {
            lang: "fr",
            value: "Age Début Consommation Tabac",
          },
        ],
        disabledLangName: [],
        type: "num",
        expression: "@OBS.OBS_NUM_VAL",
        defaultFilter: "@OBS.OBS_TYPE = 'SMOKING_ONSET_AGE'",
        order: 23,
      },
      smokingStopped: {
        name: [
          {
            lang: "",
            value: "Smoking Stopped Year",
          },
          {
            lang: "en",
            value: "Smoking Stopped Year",
          },
          {
            lang: "de",
            value: "Rauchende",
          },
          {
            lang: "fr",
            value: "Année Arrêt Consommation Tabac",
          },
        ],
        disabledLangName: [],
        type: "num",
        expression: "@OBS.OBS_NUM_VAL",
        defaultFilter: "@OBS.OBS_TYPE = 'SMOKING_STOPPED'",
        order: 24,
      },
      dwSource: {
        name: [
          {
            lang: "",
            value: "DW Source",
          },
          {
            lang: "en",
            value: "DW Source",
          },
          {
            lang: "de",
            value: "DW Quelle",
          },
          {
            lang: "fr",
            value: "DW Source",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: "@PATIENT.SOURCE",
        order: 25,
      },
      calYear: {
        name: [
          {
            lang: "",
            value: "Start Year",
          },
          {
            lang: "en",
            value: "Start Year",
          },
          {
            lang: "de",
            value: "Startjahr",
          },
          {
            lang: "fr",
            value: "Année de Début",
          },
        ],
        disabledLangName: [],
        type: "num",
        expression: 'YEAR(@INTERACTION."START")',
        order: 26,
        isDefault: true,
      },
      calMonth: {
        name: [
          {
            lang: "",
            value: "Start Month",
          },
          {
            lang: "en",
            value: "Start Month",
          },
          {
            lang: "de",
            value: "Startmonat",
          },
          {
            lang: "fr",
            value: "Mois de Début",
          },
        ],
        disabledLangName: [],
        type: "num",
        expression: 'MONTH(@INTERACTION."START")',
        referenceFilter: "@REF.VOCABULARY_ID='mri.CAT.MONTHS'",
        referenceExpression: "@REF.CODE",
        order: 27,
        isDefault: true,
      },
      start: {
        name: [
          {
            lang: "",
            value: "Start Date",
          },
          {
            lang: "en",
            value: "Start Date",
          },
          {
            lang: "de",
            value: "Startdatum",
          },
          {
            lang: "fr",
            value: "Date de Début",
          },
        ],
        disabledLangName: [],
        type: "time",
        expression: 'TO_DATE(@INTERACTION."START")',
        order: 28,
        isDefault: true,
      },
      end: {
        name: [
          {
            lang: "",
            value: "End Date",
          },
          {
            lang: "en",
            value: "End Date",
          },
          {
            lang: "de",
            value: "Enddatum",
          },
          {
            lang: "fr",
            value: "Date de Fin",
          },
        ],
        disabledLangName: [],
        type: "time",
        expression: 'TO_DATE(@INTERACTION."END")',
        order: 29,
        isDefault: true,
      },
      startdatetime: {
        name: [
          {
            lang: "",
            value: "Start Date/Time",
          },
          {
            lang: "en",
            value: "Start Date/Time",
          },
          {
            lang: "de",
            value: "Startdatum/zeit",
          },
          {
            lang: "fr",
            value: "Date/Heure de Début",
          },
        ],
        disabledLangName: [],
        type: "datetime",
        expression: '@INTERACTION."START"',
        order: 30,
        isDefault: true,
      },
    },
  },
  mapping: {},
  censor: {},
  advancedSettings: {
    tableMapping: {
      "@INTERACTION": '"legacy.cdw.db.models::DWViews.Interactions"',
      "@OBS": '"legacy.cdw.db.models::DWViews.Observations"',
      "@CODE": '"legacy.cdw.db.models::DWViewsEAV.Interaction_Details"',
      "@MEASURE": '"legacy.cdw.db.models::DWViewsEAV.Interaction_Measures"',
      "@PATIENT": '"legacy.cdw.db.models::DWViews.Patient"',
      "@TEXT": '"legacy.cdw.db.models::DWViewsEAV.Interaction_Text"',
      "@REF": '"legacy.ots::Views.ConceptPreferredTerms"',
      "@INTERACTION.PATIENT_ID": '"PatientID"',
      "@INTERACTION.INTERACTION_ID": '"InteractionID"',
      "@INTERACTION.CONDITION_ID": '"ConditionID"',
      "@INTERACTION.PARENT_INTERACT_ID": '"ParentInteractionID"',
      "@INTERACTION.START": '"PeriodStart"',
      "@INTERACTION.END": '"PeriodEnd"',
      "@INTERACTION.INTERACTION_TYPE": '"InteractionTypeValue"',
      "@OBS.PATIENT_ID": '"PatientID"',
      "@OBS.OBSERVATION_ID": '"ObsID"',
      "@OBS.OBS_TYPE": '"ObsType"',
      "@OBS.OBS_CHAR_VAL": '"ObsCharValue"',
      "@CODE.INTERACTION_ID": '"InteractionID"',
      "@CODE.ATTRIBUTE": '"AttributeValue"',
      "@CODE.VALUE": '"Value"',
      "@MEASURE.INTERACTION_ID": '"InteractionID"',
      "@MEASURE.ATTRIBUTE": '"AttributeValue"',
      "@MEASURE.VALUE": '"Value"',
      "@REF.VOCABULARY_ID": '"ConceptVocabularyID"',
      "@REF.CODE": '"ConceptCode"',
      "@REF.TEXT": '"TermText"',
      "@TEXT.INTERACTION_TEXT_ID": '"InteractionTextID"',
      "@TEXT.INTERACTION_ID": '"InteractionID"',
      "@TEXT.VALUE": '"Value"',
      "@PATIENT.PATIENT_ID": '"PatientID"',
      "@PATIENT.DOD": '"DeceasedDate"',
      "@PATIENT.DOB": '"BirthDate"',
    },
    guardedTableMapping: {
      "@PATIENT": '"legacy.cdw.db.models::DWViews.V_GuardedPatient"',
    },
    language: ["en", "de", "fr"],
    settings: {
      fuzziness: 0.7,
      maxResultSize: 5000,
      sqlReturnOn: true,
      errorDetailsReturnOn: true,
      errorStackTraceReturnOn: true,
      enableFreeText: true,
      vbEnabled: true,
      dateFormat: "YYYY-MM-dd",
      timeFormat: "HH:mm:ss",
    },
    others: {
      sqlReturnOn: false,
      errorDetailsReturnOn: false,
      errorStackTraceReturnOn: false,
    },
    shared: {},
    configId: "",
    schemaVersion: "1.0",
  },
};
