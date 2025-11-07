var Transformation = {
  source: {
    title: "",
    id: "",
    rootNode: {
      tag: "CRMXIF_ORDER_SAVE_U01",
      type: "element",
      name: "",
      occ: "1..1",
      nodes: [
        {
          tag: "IDOC",
          type: "element",
          name: "",
          occ: "1..1",
          nodes: [
            {
              tag: "BEGIN",
              type: "attribute",
              name: "",
              occ: "1..1",
              nodes: [],
            },
            {
              tag: "EDI_DC40",
              type: "element",
              name: "",
              occ: "1..1",
              nodes: [],
            },
          ],
        },
      ],
    },
  },
  target: {
    title: "",
    id: "",
    rootNode: {
      tag: "ns0:LeadReplicationBulkReplicateRequest",
      type: "element",
      name: "",
      occ: "1..1",
      nodes: [
        {
          tag: "MessageHeader",
          type: "element",
          name: "",
          occ: "1..1",
          nodes: [
            {
              tag: "schemeID",
              type: "attribute",
              name: "",
              occ: "0..1",
              nodes: [],
            },
            {
              tag: "schemeAgencyID",
              type: "attribute",
              name: "",
              occ: "0..1",
              nodes: [],
            },
          ],
        },
      ],
    },
  },
  mappings: [
    {
      fn: {
        description: "",
        expression: "",
      },
      sourcePaths: [],
      targetPaths: [
        "/ns0:LeadReplicationBulkReplicateRequest/MessageHeader/ID",
      ],
      id: "__ia__mapping0",
    },
    {
      fn: {
        description: "",
        expression: "",
      },
      sourcePaths: ["/CRMXIF_ORDER_SAVE_U01/IDOC/EDI_DC40"],
      targetPaths: [
        "/ns0:LeadReplicationBulkReplicateRequest/MessageHeader/schemeAgencyID",
      ],
      id: "__ia__mapping1",
    },
    {
      fn: {
        description: "",
        expression: "",
      },
      sourcePaths: ["/CRMXIF_ORDER_SAVE_U01/IDOC/BEGIN"],
      targetPaths: [
        "/ns0:LeadReplicationBulkReplicateRequest/MessageHeader/schemeID",
      ],
      id: "__ia__mapping2",
    },
  ],
};
