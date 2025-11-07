// tslint:disable
export default {
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
                value: "Primäre Tumordiagnose",
              },
              {
                lang: "fr",
                value: "Diagnostic primaire",
              },
              {
                lang: "es",
                value: "Diagnóstico de tumor primario",
              },
              {
                lang: "pt",
                value: "Diagnóstico de tumor primário",
              },
              {
                lang: "zh",
                value: "主肿瘤诊断",
              },
            ],
            defaultFilter: "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M03'",
            defaultFilterKey: "ACME_M03",
            order: 4,
            parentInteraction: [],
            parentInteractionLabel: "Parent",
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
                  {
                    lang: "es",
                    value: "Código ICD-10-CM",
                  },
                  {
                    lang: "pt",
                    value: "Código ICD-10-CM",
                  },
                  {
                    lang: "zh",
                    value: "ICD-10-CM 代码",
                  },
                ],
                type: "text",
                expression: 'LEFT(@CODE."Value",3)',
                defaultFilter: "@CODE.\"AttributeValue\" = 'ICD_10'",
                referenceFilter:
                  '@REF."VocabularyID" = \'ots.ICD.ICD10GM\' AND @REF."Language"=\'de\' AND (LENGTH(@REF."Code")=3 OR (LENGTH(@REF."Code")=5 AND @REF."Code" LIKE \'%.-\'))',
                referenceExpression: 'LEFT(@REF."Code",3)',
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
                  {
                    lang: "es",
                    value: "Código ICD-9-CM",
                  },
                  {
                    lang: "pt",
                    value: "Código ICD-9-CM",
                  },
                  {
                    lang: "zh",
                    value: "ICD-9-CM 代码",
                  },
                ],
                type: "text",
                expression: 'LEFT(@CODE."Value",3)',
                defaultFilter: "@CODE.\"AttributeValue\" = 'ICD_9'",
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
                    value: "Âge au diagnostic",
                  },
                  {
                    lang: "es",
                    value: "Edad del diagnóstico",
                  },
                  {
                    lang: "pt",
                    value: "Idade no momento do diagnóstico",
                  },
                  {
                    lang: "zh",
                    value: "诊断年龄",
                  },
                ],
                type: "num",
                expression:
                  'FLOOR(DAYS_BETWEEN(@PATIENT."BirthDate",@INTERACTION."PeriodEnd") / 365)',
                defaultFilter:
                  '@PATIENT."BirthDate" <= @INTERACTION."PeriodEnd"',
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
                    value: "Lungenkrebs-Subtyp",
                  },
                  {
                    lang: "fr",
                    value: "Type de cancer pulmonaire",
                  },
                  {
                    lang: "es",
                    value: "Subtipo de cáncer de pulmón",
                  },
                  {
                    lang: "pt",
                    value: "Subtipo câncer de pulmão",
                  },
                  {
                    lang: "zh",
                    value: "肺癌子类型",
                  },
                ],
                type: "text",
                expression: '@CODE."Value"',
                eavExpressionKey: "LC_TYPE",
                defaultFilter: "@CODE.\"AttributeValue\" = 'LC_TYPE'",
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
                    value: "Freitext einer Diagnose",
                  },
                  {
                    lang: "fr",
                    value: "Texte libre au diagnostic",
                  },
                  {
                    lang: "es",
                    value: "Texto libre de diagnóstico",
                  },
                  {
                    lang: "pt",
                    value: "Texto livre de diagnóstico",
                  },
                  {
                    lang: "zh",
                    value: "诊断自由文本",
                  },
                ],
                type: "freetext",
                expression: '@TEXT."Value"',
                defaultFilter: "@TEXT.\"Attribute\" = 'INTERACTIONS_FREETEXT'",
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
                  {
                    lang: "es",
                    value: "Histología",
                  },
                  {
                    lang: "pt",
                    value: "Histologia",
                  },
                  {
                    lang: "zh",
                    value: "组织学",
                  },
                ],
                type: "text",
                expression: '@CODE."Value"',
                eavExpressionKey: "Histology",
                defaultFilter: "@CODE.\"AttributeValue\" = 'Histology'",
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
                    value: "Abréviation de cancer",
                  },
                  {
                    lang: "es",
                    value: "Abreviatura de cáncer",
                  },
                  {
                    lang: "pt",
                    value: "Abreviatura de câncer",
                  },
                  {
                    lang: "zh",
                    value: "癌症缩写",
                  },
                ],
                type: "text",
                expression: '@CODE."Value"',
                eavExpressionKey: "TCGA_CODE",
                defaultFilter: "@CODE.\"AttributeValue\" = 'TCGA_CODE'",
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
                    value: "Type de cancer",
                  },
                  {
                    lang: "es",
                    value: "Tipo de cáncer",
                  },
                  {
                    lang: "pt",
                    value: "Tipo de câncer",
                  },
                  {
                    lang: "zh",
                    value: "癌症类型",
                  },
                ],
                type: "text",
                expression: '@CODE."Value"',
                eavExpressionKey: "TCGA_CANCER",
                defaultFilter: "@CODE.\"AttributeValue\" = 'TCGA_CANCER'",
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
                value: "Biobank",
              },
              {
                lang: "fr",
                value: "Biobanque",
              },
              {
                lang: "es",
                value: "Biobanco",
              },
              {
                lang: "pt",
                value: "Biobanco",
              },
              {
                lang: "zh",
                value: "生物样本库",
              },
            ],
            defaultFilter: "@INTERACTION.\"InteractionTypeValue\" = 'BIOBANK'",
            defaultFilterKey: "BIOBANK",
            order: 5,
            parentInteraction: [],
            parentInteractionLabel: "Parent",
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
                    value: "Probenstatus",
                  },
                  {
                    lang: "fr",
                    value: "État de l'échantillon",
                  },
                  {
                    lang: "es",
                    value: "Estado de muestra",
                  },
                  {
                    lang: "pt",
                    value: "Status de amostra",
                  },
                  {
                    lang: "zh",
                    value: "样品状态",
                  },
                ],
                type: "text",
                expression: '@CODE."Value"',
                defaultFilter: "@CODE.\"AttributeValue\" = 'BIOBANK_STATUS'",
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
                    value: "Type de tissu/liquide",
                  },
                  {
                    lang: "es",
                    value: "Tejido / tipo de líquido",
                  },
                  {
                    lang: "pt",
                    value: "Tipo de tecido/líquido",
                  },
                  {
                    lang: "zh",
                    value: "组织/液体类型",
                  },
                ],
                type: "text",
                expression: '@CODE."Value"',
                defaultFilter: "@CODE.\"AttributeValue\" = 'BIOBANK_TYPE'",
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
              {
                lang: "es",
                value: "Quimioterapia",
              },
              {
                lang: "pt",
                value: "Quimioterapia",
              },
              {
                lang: "zh",
                value: "化学疗法",
              },
            ],
            defaultFilter:
              "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M07_CHEMO'",
            defaultFilterKey: "ACME_M07_CHEMO",
            order: 6,
            parentInteraction: ["patient.conditions.acme.interactions.priDiag"],
            parentInteractionLabel: "Parent",
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
                    value: "Nombre d'interactions",
                  },
                  {
                    lang: "es",
                    value: "Cantidad de interacciones",
                  },
                  {
                    lang: "pt",
                    value: "Contagem de interações",
                  },
                  {
                    lang: "zh",
                    value: "交互次数",
                  },
                ],
                type: "num",
                measureExpression:
                  'COUNT(DISTINCT(@INTERACTION."InteractionID"))',
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
                  {
                    lang: "es",
                    value: "Código OPS",
                  },
                  {
                    lang: "pt",
                    value: "Código OPS",
                  },
                  {
                    lang: "zh",
                    value: "OPS 代码",
                  },
                ],
                type: "text",
                expression: '@CODE."Value"',
                defaultFilter: "@CODE.\"AttributeValue\" = 'CHEMO_OPS'",
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
                  {
                    lang: "es",
                    value: "Protocolo",
                  },
                  {
                    lang: "pt",
                    value: "Protocolo",
                  },
                  {
                    lang: "zh",
                    value: "协议",
                  },
                ],
                type: "text",
                expression: '@CODE."Value"',
                defaultFilter: "@CODE.\"AttributeValue\" = 'CHEMO_PROT'",
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
                    value: "Nb d'interactions par patient",
                  },
                  {
                    lang: "es",
                    value: "Interacciones por paciente",
                  },
                  {
                    lang: "pt",
                    value: "Interações por paciente",
                  },
                  {
                    lang: "zh",
                    value: "每名病患的交互",
                  },
                ],
                type: "num",
                measureExpression:
                  'COUNT(DISTINCT(@INTERACTION."InteractionID")) / COUNT(DISTINCT(@PATIENT."PatientID"))',
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
              {
                lang: "es",
                value: "Radioterapia",
              },
              {
                lang: "pt",
                value: "Radioterapia",
              },
              {
                lang: "zh",
                value: "放射疗法",
              },
            ],
            defaultFilter:
              "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M07_RADIO'",
            defaultFilterKey: "ACME_M07_RADIO",
            order: 7,
            parentInteraction: [],
            parentInteractionLabel: "Parent",
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
                    value: "Dose de rayonnement (Gy)",
                  },
                  {
                    lang: "es",
                    value: "Dosificación de radio (Gy)",
                  },
                  {
                    lang: "pt",
                    value: "Dosagem de radiação (Gy)",
                  },
                  {
                    lang: "zh",
                    value: "放射剂量 (Gy)",
                  },
                ],
                type: "num",
                expression: '@MEASURE."Value"',
                defaultFilter:
                  "@MEASURE.\"AttributeValue\" = 'DOSAGE' AND @MEASURE.\"Unit\" = 'Gy'",
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
                  {
                    lang: "es",
                    value: "Código OPS",
                  },
                  {
                    lang: "pt",
                    value: "Código OPS",
                  },
                  {
                    lang: "zh",
                    value: "OPS 代码",
                  },
                ],
                type: "text",
                expression: '@CODE."Value"',
                defaultFilter: "@CODE.\"AttributeValue\" = 'RADIO_OPS'",
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
              {
                lang: "es",
                value: "Intervención quirúrgica",
              },
              {
                lang: "pt",
                value: "Cirurgia",
              },
              {
                lang: "zh",
                value: "手术",
              },
            ],
            defaultFilter:
              "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M07_SURGERY'",
            defaultFilterKey: "ACME_M07_SURGERY",
            order: 8,
            parentInteraction: [],
            parentInteractionLabel: "Parent",
            attributes: {
              exist: {
                name: [
                  {
                    lang: "",
                    value: "Exist",
                  },
                  {
                    lang: "en",
                    value: "Exists",
                  },
                  {
                    lang: "de",
                    value: "Existiert",
                  },
                  {
                    lang: "fr",
                    value: "Existe",
                  },
                  {
                    lang: "es",
                    value: "Existe",
                  },
                  {
                    lang: "pt",
                    value: "Existente",
                  },
                  {
                    lang: "zh",
                    value: "存在",
                  },
                ],
                type: "text",
                expression:
                  "CASE WHEN @INTERACTION.\"InteractionID\" IS NULL THEN NULL ELSE 'YES' END",
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
                  {
                    lang: "es",
                    value: "Código OPS",
                  },
                  {
                    lang: "pt",
                    value: "Código OPS",
                  },
                  {
                    lang: "zh",
                    value: "OPS 代码",
                  },
                ],
                type: "text",
                expression: '@CODE."Value"',
                defaultFilter: "@CODE.\"AttributeValue\" = 'SURGERY_OPS'",
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
              {
                lang: "es",
                value: "Clasificación TNM",
              },
              {
                lang: "pt",
                value: "Classificação TNM",
              },
              {
                lang: "zh",
                value: "TNM 分期",
              },
            ],
            defaultFilter:
              "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M03TS'",
            defaultFilterKey: "ACME_M03TS",
            order: 9,
            parentInteraction: [],
            parentInteractionLabel: "Parent",
            attributes: {
              tnmM: {
                name: [
                  {
                    lang: "",
                    value: "M-Component",
                  },
                  {
                    lang: "en",
                    value: "M Component",
                  },
                  {
                    lang: "de",
                    value: "M Komponente",
                  },
                  {
                    lang: "fr",
                    value: "Critère M",
                  },
                  {
                    lang: "es",
                    value: "Componente M",
                  },
                  {
                    lang: "pt",
                    value: "Componente M",
                  },
                  {
                    lang: "zh",
                    value: "转移灶部分",
                  },
                ],
                type: "text",
                expression: "'M' || @CODE.\"Value\"",
                defaultFilter: "@CODE.\"AttributeValue\" = 'TNM_M'",
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
                    value: "N Component",
                  },
                  {
                    lang: "de",
                    value: "N-Komponente",
                  },
                  {
                    lang: "fr",
                    value: "Critère N",
                  },
                  {
                    lang: "es",
                    value: "Componente N",
                  },
                  {
                    lang: "pt",
                    value: "Componente N",
                  },
                  {
                    lang: "zh",
                    value: "淋巴结部分",
                  },
                ],
                type: "text",
                expression: "'N' || @CODE.\"Value\"",
                defaultFilter: "@CODE.\"AttributeValue\" = 'TNM_N'",
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
                    value: "T Component",
                  },
                  {
                    lang: "de",
                    value: "T-Komponente",
                  },
                  {
                    lang: "fr",
                    value: "Critère T",
                  },
                  {
                    lang: "es",
                    value: "Componente T",
                  },
                  {
                    lang: "pt",
                    value: "Componente T",
                  },
                  {
                    lang: "zh",
                    value: "肿瘤原发灶部分",
                  },
                ],
                type: "text",
                expression: "'T' || @CODE.\"Value\"",
                defaultFilter: "@CODE.\"AttributeValue\" = 'TNM_T'",
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
            value: "Statut vital",
          },
          {
            lang: "es",
            value: "Estado vital",
          },
          {
            lang: "pt",
            value: "Status vital",
          },
          {
            lang: "zh",
            value: "重要状态",
          },
        ],
        defaultFilter: "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M16'",
        defaultFilterKey: "ACME_M16",
        order: 3,
        parentInteraction: [],
        parentInteractionLabel: "Parent",
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
                value: "Âge au dernier contact",
              },
              {
                lang: "es",
                value: "Edad del último contacto",
              },
              {
                lang: "pt",
                value: "Idade no momento do último contato",
              },
              {
                lang: "zh",
                value: "最近联系年龄",
              },
            ],
            type: "num",
            expression:
              'FLOOR(DAYS_BETWEEN(@PATIENT."BirthDate",@INTERACTION."PeriodEnd") / 365)',
            defaultFilter: '@PATIENT."BirthDate" <= @INTERACTION."PeriodEnd"',
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
                value: "Statut vital",
              },
              {
                lang: "es",
                value: "Estado vital",
              },
              {
                lang: "pt",
                value: "Status vital",
              },
              {
                lang: "zh",
                value: "重要状态",
              },
            ],
            type: "text",
            expression: '@CODE."Value"',
            defaultFilter: "@CODE.\"AttributeValue\" = 'VITALSTATUS'",
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
                value: "Jahr des letzten Kontakts",
              },
              {
                lang: "fr",
                value: "Année du dernier contact",
              },
              {
                lang: "es",
                value: "Año del último contacto",
              },
              {
                lang: "pt",
                value: "Ano do último contato",
              },
              {
                lang: "zh",
                value: "最近联系年",
              },
            ],
            type: "num",
            expression: 'YEAR(@INTERACTION."PeriodStart")',
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
          {
            lang: "es",
            value: "Secuenciación de genoma",
          },
          {
            lang: "pt",
            value: "Sequenciamento do genoma",
          },
          {
            lang: "zh",
            value: "基因组测序",
          },
        ],
        defaultFilter: "@INTERACTION.\"InteractionTypeValue\" = 'Genomic'",
        defaultFilterKey: "Genomic",
        order: 1,
        parentInteraction: [],
        parentInteractionLabel: "Parent",
        attributes: {
          sample_id: {
            name: [
              {
                lang: "",
                value: "Sample Id",
              },
              {
                lang: "en",
                value: "Sample ID",
              },
              {
                lang: "de",
                value: "Proben-ID",
              },
              {
                lang: "fr",
                value: "ID de l'échantillon",
              },
              {
                lang: "es",
                value: "ID de muestra",
              },
              {
                lang: "pt",
                value: "ID da amostra",
              },
              {
                lang: "zh",
                value: "样本标识",
              },
            ],
            type: "text",
            expression: '@CODE."Value"',
            eavExpressionKey: "SampleIndex",
            defaultFilter: "@CODE.\"AttributeValue\" = 'SampleIndex'",
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
                value: "Génome de référence",
              },
              {
                lang: "es",
                value: "Referencia de genoma",
              },
              {
                lang: "pt",
                value: "Referência de genoma",
              },
              {
                lang: "zh",
                value: "基因组参考",
              },
            ],
            type: "text",
            expression: '@CODE."Value"',
            eavExpressionKey: "ReferenceGenome",
            defaultFilter: "@CODE.\"AttributeValue\" = 'ReferenceGenome'",
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
                value: "Probenklasse",
              },
              {
                lang: "fr",
                value: "Type d’échantillon",
              },
              {
                lang: "es",
                value: "Clase de muestra",
              },
              {
                lang: "pt",
                value: "Classe de amostras",
              },
              {
                lang: "zh",
                value: "样本类",
              },
            ],
            type: "text",
            expression: '@CODE."Value"',
            eavExpressionKey: "SampleClass",
            defaultFilter: "@CODE.\"AttributeValue\" = 'SampleClass'",
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
            value: "Variante génétique",
          },
          {
            lang: "es",
            value: "Variante genética",
          },
          {
            lang: "pt",
            value: "Variante genética",
          },
          {
            lang: "zh",
            value: "基因变异",
          },
        ],
        defaultFilter: "1=1",
        order: 2,
        from: {
          "@INTERACTION":
            '"CDMDEFAULT"."legacy.genomics.db.models::MRI.VariantInteractionsDWViews"',
        },
        parentInteraction: [],
        parentInteractionLabel: "Parent",
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
                value: "Position",
              },
              {
                lang: "fr",
                value: "Emplacement",
              },
              {
                lang: "es",
                value: "Ubicación",
              },
              {
                lang: "pt",
                value: "Localização",
              },
              {
                lang: "zh",
                value: "位置",
              },
            ],
            type: "num",
            expression: "@INTERACTION.POSITION_START",
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
              {
                lang: "es",
                value: "Gen",
              },
              {
                lang: "pt",
                value: "Gene",
              },
              {
                lang: "zh",
                value: "基因",
              },
            ],
            type: "text",
            expression: "@INTERACTION.GENE_NAME",
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
              {
                lang: "es",
                value: "Región",
              },
              {
                lang: "pt",
                value: "Região",
              },
              {
                lang: "zh",
                value: "区域",
              },
            ],
            type: "text",
            expression: "@INTERACTION.REGION",
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
                value: "Type de variante",
              },
              {
                lang: "es",
                value: "Tipo de variante",
              },
              {
                lang: "pt",
                value: "Tipo de variante",
              },
              {
                lang: "zh",
                value: "变异类型",
              },
            ],
            type: "text",
            expression: "@INTERACTION.VARIANT_TYPE",
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
                value: "Altération de séquence",
              },
              {
                lang: "es",
                value: "Alteración de secuencia",
              },
              {
                lang: "pt",
                value: "Alteração sequência",
              },
              {
                lang: "zh",
                value: "序列变化",
              },
            ],
            type: "text",
            expression: "@INTERACTION.SEQUENCE_ALTERATION",
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
                value: "Aminosäurenreferenz",
              },
              {
                lang: "fr",
                value: "Acide aminé de référence",
              },
              {
                lang: "es",
                value: "Referencia de aminoácido",
              },
              {
                lang: "pt",
                value: "Referência aminoácido",
              },
              {
                lang: "zh",
                value: "氨基酸参考",
              },
            ],
            type: "text",
            expression: "@INTERACTION.AA_REF",
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
                value: "Acide aminé",
              },
              {
                lang: "es",
                value: "Aminoácido",
              },
              {
                lang: "pt",
                value: "Aminoácido",
              },
              {
                lang: "zh",
                value: "氨基酸",
              },
            ],
            type: "text",
            expression: "@INTERACTION.AA_ALT",
            relationExpressionKey: "AA_ALT",
            order: 7,
          },
          dw_audit_id: {
            name: [
              {
                lang: "",
                value: "DWAuditID",
              },
              {
                lang: "en",
                value: "DWAuditID",
              },
              {
                lang: "de",
                value: "DWAuditID",
              },
              {
                lang: "fr",
                value: "IDAuditDW",
              },
              {
                lang: "es",
                value: "DWAuditID",
              },
              {
                lang: "pt",
                value: "DWAuditID",
              },
              {
                lang: "zh",
                value: "DWAuditID",
              },
            ],
            type: "text",
            expression: '@INTERACTION."DWAuditID"',
            order: 8,
            annotations: ["genomics_dw_audit_id"],
          },
          variant_index: {
            name: [
              {
                lang: "",
                value: "Variant Index",
              },
              {
                lang: "en",
                value: "Variant Index",
              },
              {
                lang: "de",
                value: "Variantenindex",
              },
              {
                lang: "fr",
                value: "Index de variantes",
              },
              {
                lang: "es",
                value: "Índice de variante",
              },
              {
                lang: "pt",
                value: "Índice de variantes",
              },
              {
                lang: "zh",
                value: "变异指数",
              },
            ],
            type: "text",
            expression: '@INTERACTION."VariantIndex"',
            order: 9,
            annotations: ["genomics_variant_index"],
          },
          allele_index: {
            name: [
              {
                lang: "",
                value: "Allele Index",
              },
              {
                lang: "en",
                value: "Allele Index",
              },
              {
                lang: "de",
                value: "Allelenindex",
              },
              {
                lang: "fr",
                value: "Index d’allèles",
              },
              {
                lang: "es",
                value: "Índice de alelo",
              },
              {
                lang: "pt",
                value: "Índice de alelos",
              },
              {
                lang: "zh",
                value: "等位基因指数",
              },
            ],
            type: "text",
            expression: '@INTERACTION."AlleleIndex"',
            order: 10,
            annotations: ["genomics_allele_index"],
          },
          sample_index: {
            name: [
              {
                lang: "",
                value: "Sample Index",
              },
              {
                lang: "en",
                value: "Sample Index",
              },
              {
                lang: "de",
                value: "Probenindex",
              },
              {
                lang: "fr",
                value: "Index d’échantillons",
              },
              {
                lang: "es",
                value: "Índice de muestra",
              },
              {
                lang: "pt",
                value: "Índice de amostras",
              },
              {
                lang: "zh",
                value: "样本指数",
              },
            ],
            type: "text",
            expression: '@INTERACTION."SampleIndex"',
            order: 11,
            annotations: ["genomics_sample_index"],
          },
        },
      },
      Medication_Administered: {
        name: [
          {
            lang: "",
            value: "Medication, Administered",
          },
          {
            lang: "en",
            value: "Medication, Administered",
          },
          {
            lang: "de",
            value: "Medikamente, verabreicht",
          },
          {
            lang: "fr",
            value: "Médicaments administrés",
          },
          {
            lang: "es",
            value: "Medicación, administrada",
          },
          {
            lang: "pt",
            value: "Medicação, administrada",
          },
          {
            lang: "zh",
            value: "管制药品",
          },
        ],
        defaultFilter:
          "@INTERACTION.\"InteractionTypeValue\" = 'Medication, Administered'",
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
              {
                lang: "en",
                value: "Dosage",
              },
              {
                lang: "de",
                value: "Dosierung",
              },
              {
                lang: "fr",
                value: "Dosage",
              },
              {
                lang: "es",
                value: "Dosificación",
              },
              {
                lang: "pt",
                value: "Dosagem",
              },
              {
                lang: "zh",
                value: "剂量",
              },
            ],
            type: "num",
            expression: '@MEASURE."Value"',
            defaultFilter: "@MEASURE.\"AttributeValue\" = 'Dosage'",
            order: 0,
          },
          Drug_ID: {
            name: [
              {
                lang: "",
                value: "Drug ID",
              },
              {
                lang: "en",
                value: "Drug ID",
              },
              {
                lang: "de",
                value: "Arzneimittel-ID",
              },
              {
                lang: "fr",
                value: "ID de médicament",
              },
              {
                lang: "es",
                value: "ID de medicamento",
              },
              {
                lang: "pt",
                value: "ID de medicamento",
              },
              {
                lang: "zh",
                value: "药品标识",
              },
            ],
            type: "text",
            expression: '@CODE."Value"',
            defaultFilter: "@CODE.\"AttributeValue\" = 'Drug ID'",
            order: 1,
          },
          Unit: {
            name: [
              {
                lang: "",
                value: "Unit",
              },
              {
                lang: "en",
                value: "Unit",
              },
              {
                lang: "de",
                value: "Einheit",
              },
              {
                lang: "fr",
                value: "Unité",
              },
              {
                lang: "es",
                value: "Unidad",
              },
              {
                lang: "pt",
                value: "Unidade",
              },
              {
                lang: "zh",
                value: "单位",
              },
            ],
            type: "text",
            expression: '@MEASURE."Unit"',
            defaultFilter: "@MEASURE.\"AttributeValue\" = 'Dosage'",
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
            value: "Mesure du poids",
          },
          {
            lang: "es",
            value: "Medición del peso",
          },
          {
            lang: "pt",
            value: "Medição do peso",
          },
          {
            lang: "zh",
            value: "体重测量",
          },
        ],
        defaultFilter:
          "@INTERACTION.\"InteractionTypeValue\" = 'Weight Measurement'",
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
              {
                lang: "es",
                value: "Peso",
              },
              {
                lang: "pt",
                value: "Peso",
              },
              {
                lang: "zh",
                value: "体重",
              },
            ],
            type: "num",
            expression: 'ROUND(@MEASURE."Value",1)',
            defaultFilter: "@MEASURE.\"AttributeValue\" = 'Weight'",
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
            value: "ID du patient",
          },
          {
            lang: "es",
            value: "ID de paciente",
          },
          {
            lang: "pt",
            value: "ID do paciente",
          },
          {
            lang: "zh",
            value: "病患标识",
          },
        ],
        type: "text",
        expression: '@PATIENT."PatientID"',
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
          {
            lang: "es",
            value: "Fumador",
          },
          {
            lang: "pt",
            value: "Fumante",
          },
          {
            lang: "zh",
            value: "吸烟者",
          },
        ],
        type: "text",
        expression: '@OBS."ObsCharValue"',
        defaultFilter: "@OBS.\"ObsType\" = 'SMOKER'",
        referenceFilter:
          "@REF.\"VocabularyID\"='mri.CAT.YES-NO' AND @REF.\"Language\"='en'",
        referenceExpression: '@REF."Code"',
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
            value: "Nombre de patients",
          },
          {
            lang: "es",
            value: "Número de pacientes",
          },
          {
            lang: "pt",
            value: "Número de pacientes",
          },
          {
            lang: "zh",
            value: "病患计数",
          },
        ],
        type: "num",
        measureExpression: 'COUNT(DISTINCT(@PATIENT."PatientID"))',
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
          {
            lang: "es",
            value: "Nacionalidad",
          },
          {
            lang: "pt",
            value: "Nacionalidade",
          },
          {
            lang: "zh",
            value: "国籍",
          },
        ],
        type: "text",
        expression: '@PATIENT."NationalityValue"',
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
          {
            lang: "es",
            value: "Cohorte",
          },
          {
            lang: "pt",
            value: "Coorte",
          },
          {
            lang: "zh",
            value: "群",
          },
        ],
        type: "text",
        expression: '@OBS."ObsCharValue"',
        defaultFilter: '@OBS."ObsCharValue"=@OBS."ObsCharValue"',
        order: 5,
        from: {
          "@OBS":
            '"CDMDEFAULT"."legacy.cdw.db.models::DWViews.CollectionsAsObservation"',
        },
      },
      cohortStatus: {
        name: [
          {
            lang: "",
            value: "Cohort Patient Status",
          },
          {
            lang: "en",
            value: "Cohort Patient Status",
          },
          {
            lang: "de",
            value: "Patientenstatus in Kohorte",
          },
          {
            lang: "fr",
            value: "Patients dans la cohorte",
          },
          {
            lang: "es",
            value: "Estado de paciente de cohorte",
          },
          {
            lang: "pt",
            value: "Status do paciente de coorte",
          },
          {
            lang: "zh",
            value: "病患群状态",
          },
        ],
        disabledLangName: [],
        type: "text",
        expression: '@OBS."ObsCharValue"',
        defaultFilter: "@OBS.\"Language\"='en'",
        order: 6,
        from: {
          "@OBS":
            '"CDMDEFAULT"."legacy.cdw.db.models::DWViews.CohortStatusAsObservation"',
        },
      },
      firstName: {
        name: [
          {
            lang: "",
            value: "First Name",
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
          {
            lang: "es",
            value: "Nombre",
          },
          {
            lang: "pt",
            value: "Primeiro nome",
          },
          {
            lang: "zh",
            value: "名字",
          },
        ],
        type: "text",
        expression: '@PATIENT."GivenName"',
        order: 6,
      },
      lastName: {
        name: [
          {
            lang: "",
            value: "Last Name",
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
          {
            lang: "es",
            value: "Apellido 1",
          },
          {
            lang: "pt",
            value: "Sobrenome",
          },
          {
            lang: "zh",
            value: "姓氏",
          },
        ],
        type: "text",
        expression: '@PATIENT."FamilyName"',
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
            value: "Straße",
          },
          {
            lang: "fr",
            value: "Rue",
          },
          {
            lang: "es",
            value: "Calle",
          },
          {
            lang: "pt",
            value: "Rua",
          },
          {
            lang: "zh",
            value: "街道",
          },
        ],
        type: "text",
        expression: '@PATIENT."StreetName"',
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
            value: "Ort",
          },
          {
            lang: "fr",
            value: "Ville",
          },
          {
            lang: "es",
            value: "Población",
          },
          {
            lang: "pt",
            value: "Cidade",
          },
          {
            lang: "zh",
            value: "城市",
          },
        ],
        type: "text",
        expression: '@PATIENT."City"',
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
            value: "Postleitzahl",
          },
          {
            lang: "fr",
            value: "Code postal",
          },
          {
            lang: "es",
            value: "Código postal",
          },
          {
            lang: "pt",
            value: "Código postal",
          },
          {
            lang: "zh",
            value: "邮政编码",
          },
        ],
        type: "text",
        expression: '@PATIENT."PostalCode"',
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
          {
            lang: "es",
            value: "Región",
          },
          {
            lang: "pt",
            value: "Região",
          },
          {
            lang: "zh",
            value: "区域",
          },
        ],
        type: "text",
        expression: '@PATIENT."State"',
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
          {
            lang: "es",
            value: "País",
          },
          {
            lang: "pt",
            value: "País",
          },
          {
            lang: "zh",
            value: "国家/地区",
          },
        ],
        type: "text",
        expression: '@PATIENT."CountryValue"',
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
          {
            lang: "es",
            value: "Sexo",
          },
          {
            lang: "pt",
            value: "Sexo",
          },
          {
            lang: "zh",
            value: "性别",
          },
        ],
        type: "text",
        expression: '@PATIENT."GenderValue"',
        referenceFilter:
          "@REF.\"VocabularyID\"='mri.CAT.GENDER' AND @REF.\"Language\"='en'",
        referenceExpression: '@REF."Code"',
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
            value: "Mois de naissance",
          },
          {
            lang: "es",
            value: "Mes de nacimiento",
          },
          {
            lang: "pt",
            value: "Mês de nascimento",
          },
          {
            lang: "zh",
            value: "出生月份",
          },
        ],
        type: "num",
        expression: 'MONTH(@PATIENT."BirthDate")',
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
            value: "Année de naissance",
          },
          {
            lang: "es",
            value: "Año de nacimiento",
          },
          {
            lang: "pt",
            value: "Ano de nascimento",
          },
          {
            lang: "zh",
            value: "出生年",
          },
        ],
        type: "num",
        expression: 'YEAR(@PATIENT."BirthDate")',
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
            value: "Date de naissance",
          },
          {
            lang: "es",
            value: "Fecha de nacimiento",
          },
          {
            lang: "pt",
            value: "Data de nascimento",
          },
          {
            lang: "zh",
            value: "出生日期",
          },
        ],
        type: "time",
        expression: '@PATIENT."BirthDate"',
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
            value: "Date du décès",
          },
          {
            lang: "es",
            value: "Fecha de fallecimiento",
          },
          {
            lang: "pt",
            value: "Data do óbito",
          },
          {
            lang: "zh",
            value: "死亡日期",
          },
        ],
        type: "time",
        expression: '@PATIENT."DeceasedDate"',
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
            value: "État matrimonial",
          },
          {
            lang: "es",
            value: "Estado civil",
          },
          {
            lang: "pt",
            value: "Estado civil",
          },
          {
            lang: "zh",
            value: "婚姻状况",
          },
        ],
        type: "text",
        expression: '@PATIENT."MaritalStatusValue"',
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
          {
            lang: "es",
            value: "Título",
          },
          {
            lang: "pt",
            value: "Título",
          },
          {
            lang: "zh",
            value: "标题",
          },
        ],
        type: "text",
        expression: '@PATIENT."TitleValue"',
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
          {
            lang: "es",
            value: "Tipo de marcador biológico",
          },
          {
            lang: "pt",
            value: "Tipo de biomarcador",
          },
          {
            lang: "zh",
            value: "生物标志类型",
          },
        ],
        type: "text",
        expression: '@OBS."ObsCharValue"',
        defaultFilter: "@OBS.\"ObsType\" = 'BIOMARKER'",
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
            value: "Packungsjahre des Rauchers",
          },
          {
            lang: "fr",
            value: "Tabac consommé (paquet-année)",
          },
          {
            lang: "es",
            value: "Paquetes-años fumados",
          },
          {
            lang: "pt",
            value: "Pacotes-ano fumados",
          },
          {
            lang: "zh",
            value: "吸烟指数",
          },
        ],
        type: "num",
        expression: '@OBS."ObsNumValue"',
        defaultFilter: "@OBS.\"ObsType\" = 'PACK_YEARS_SMOKED'",
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
            value: "Beginn des Rauchens",
          },
          {
            lang: "fr",
            value: "Année début consommation tabac",
          },
          {
            lang: "es",
            value: "Año en que empezó a fumar",
          },
          {
            lang: "pt",
            value: "Ano em que o fumante começou a fumar",
          },
          {
            lang: "zh",
            value: "开始吸烟的年份",
          },
        ],
        type: "num",
        expression: '@OBS."ObsNumValue"',
        defaultFilter: "@OBS.\"ObsType\" = 'SMOKING_ONSET'",
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
            value: "Alter bei Beginn des Rauchens",
          },
          {
            lang: "fr",
            value: "Âge début consommation tabac",
          },
          {
            lang: "es",
            value: "Edad en que empezó a fumar",
          },
          {
            lang: "pt",
            value: "Idade com que o fumante começou a fumar",
          },
          {
            lang: "zh",
            value: "开始吸烟的年龄",
          },
        ],
        type: "num",
        expression: '@OBS."ObsNumValue"',
        defaultFilter: "@OBS.\"ObsType\" = 'SMOKING_ONSET_AGE'",
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
            value: "Ende des Rauchens",
          },
          {
            lang: "fr",
            value: "Année arrêt consommation tabac",
          },
          {
            lang: "es",
            value: "Año en que dejó de fumar",
          },
          {
            lang: "pt",
            value: "Ano em que o fumante deixou de fumar",
          },
          {
            lang: "zh",
            value: "停止吸烟的年份",
          },
        ],
        type: "num",
        expression: '@OBS."ObsNumValue"',
        defaultFilter: "@OBS.\"ObsType\" = 'SMOKING_STOPPED'",
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
            value: "DW Source",
          },
          {
            lang: "fr",
            value: "DW Source",
          },
          {
            lang: "es",
            value: "Fuente de almacén de datos",
          },
          {
            lang: "pt",
            value: "Fonte de armazenamento de dados",
          },
          {
            lang: "zh",
            value: "数据仓库源",
          },
        ],
        type: "text",
        expression: '@PATIENT."Source"',
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
            value: "Année de début",
          },
          {
            lang: "es",
            value: "Año de inicio",
          },
          {
            lang: "pt",
            value: "Ano de início",
          },
          {
            lang: "zh",
            value: "开始年份",
          },
        ],
        type: "num",
        expression: 'YEAR(@INTERACTION."PeriodStart")',
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
            value: "Mois de début",
          },
          {
            lang: "es",
            value: "Mes de inicio",
          },
          {
            lang: "pt",
            value: "Mês de início",
          },
          {
            lang: "zh",
            value: "开始月份",
          },
        ],
        type: "num",
        expression: 'MONTH(@INTERACTION."PeriodStart")',
        referenceFilter:
          "@REF.\"VocabularyID\"='mri.CAT.MONTHS' AND @REF.\"Language\"='en'",
        referenceExpression: '@REF."Code"',
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
            value: "Date de début",
          },
          {
            lang: "es",
            value: "Fecha de inicio",
          },
          {
            lang: "pt",
            value: "Data de início",
          },
          {
            lang: "zh",
            value: "开始日期",
          },
        ],
        type: "time",
        expression: 'TO_DATE(@INTERACTION."PeriodStart")',
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
            value: "Date de fin",
          },
          {
            lang: "es",
            value: "Fecha de fin",
          },
          {
            lang: "pt",
            value: "Data de fim",
          },
          {
            lang: "zh",
            value: "结束日期",
          },
        ],
        type: "time",
        expression: 'TO_DATE(@INTERACTION."PeriodEnd")',
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
            value: "Startdatum/-zeit",
          },
          {
            lang: "fr",
            value: "Date/Heure de début",
          },
          {
            lang: "es",
            value: "Fecha y hora de inicio",
          },
          {
            lang: "pt",
            value: "Data/hora de início",
          },
          {
            lang: "zh",
            value: "开始日期/时间",
          },
        ],
        type: "datetime",
        expression: '@INTERACTION."PeriodStart"',
        order: 30,
        isDefault: true,
      },
    },
  },
  mapping: {},
  censor: {},
};
