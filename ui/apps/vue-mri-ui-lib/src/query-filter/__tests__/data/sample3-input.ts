export default {
  entryEvents: {},
  inclusionCriteria: {
    qualifyingEventsLimit: 'ALL', // options: 'ALL', 'EARLIEST', 'LATEST'
    criteria: [
      {
        id: 'criteria_1749626300526',
        title: 'Criteria 1',
        description: 'Description 1',
        criteriaType: 'ALL', // options: 'ALL', 'ANY', 'AT_LEAST', 'AT_MOST'
        events: [
          {
            id: 'event_1749626300526',
            eventType: 'conditionOccurrence',
            isExpanded: true,
            attributes: [
              {
                id: 'attribute_1749626300526',
                attributeType: 'nested',
                nestedCriteria: {
                  id: 'criteria_1749626300528',
                  criteriaType: 'ALL', // options: 'ALL', 'ANY', 'AT_LEAST', 'AT_MOST'
                  events: [
                    {
                      id: 'event_1749626300529',
                      eventType: 'conditionOccurrence',
                      isExpanded: true,
                      attributes: [],
                      cardinality: {
                        type: 'AT_LEAST',
                        count: 1,
                        using: 'ALL',
                      },
                    },
                  ],
                },
              },
            ],
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              using: 'ALL',
            },
          },
          {
            id: 'event_1749626302603',
            eventType: 'conditionOccurrence',
            isExpanded: true,
            attributes: [],
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              using: 'ALL',
            },
          },
        ],
      },
    ],
  },
}

