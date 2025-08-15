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
                                          attributes: [
                                            {
                                              id: 'attribute_1749626300527',
                                              attributeId: 'gender',
                                              attributeType: 'standard',
                                              configType: 'concept',
                                              domainFilter: 'Gender',
                                              conceptItems: [],
                                            },
                                          ],
                                          cardinality: {
                                            type: 'AT_LEAST', // options: 'exactly', 'atMost', 'atLeast'
                                            count: 1,
                                            using: 'ALL',
                                          },
                                        },
                                      ],
                                    },
                                  },
                                ],
                                cardinality: {
                                  type: 'AT_LEAST', // options: 'exactly', 'atMost', 'atLeast'
                                  count: 1,
                                  using: 'ALL',
                                },
                              },
                            ],
                          },
                        },
                      ],
                      cardinality: {
                        type: 'AT_LEAST', // options: 'exactly', 'atMost', 'atLeast'
                        count: 1,
                        using: 'ALL',
                      },
                    },
                  ],
                },
              },
            ],
            cardinality: {
              type: 'AT_LEAST', // options: 'exactly', 'atMost', 'atLeast'
              count: 1,
              using: 'ALL',
            },
          },
          {
            id: 'event_1749626302603',
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
                      attributes: [
                        {
                          id: 'attribute_1749626300529',
                          attributeId: 'age',
                          attributeType: 'numericRange',
                          operator: 'GREATER_THAN',
                          value: '5',
                        },
                      ],
                      cardinality: {
                        type: 'AT_LEAST', // options: 'exactly', 'atMost', 'atLeast'
                        count: 1,
                        using: 'ALL',
                      },
                    },
                  ],
                },
              },
            ],
            cardinality: {
              type: 'AT_LEAST', // options: 'exactly', 'atMost', 'atLeast'
              count: 1,
              using: 'ALL',
            },
          },
        ],
      },
      {
        id: 'criteria_1749626300531',
        title: 'Criteria 2',
        description: 'Description 2',
        criteriaType: 'ALL', // options: 'ALL', 'ANY', 'AT_LEAST', 'AT_MOST'
        events: [
          {
            id: 'event_1749626300526',
            eventType: 'demographic',
            isExpanded: true,
            attributes: [
              {
                id: 'attribute_1749626300529',
                attributeId: 'age',
                attributeType: 'numericRange',
                operator: 'GREATER_THAN',
                value: '7',
              },
            ],
          },
        ],
      },
    ],
  },
}
