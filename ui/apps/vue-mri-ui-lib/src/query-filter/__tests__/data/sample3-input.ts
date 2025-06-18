export default {
  id: 'criteria_1749626300526_hwumpmeea',
  criteriaType: 'ALL', // options: 'ALL', 'EARLIEST', 'LATEST'
  criteria: [
    {
      id: 'group_1749626300526_hwumpmeet',
      title: 'Group 1',
      description: 'Description 1',
      groupType: 'ALL', // options: 'ALL', 'ANY', 'AT_LEAST', 'AT_MOST'
      groups: [
        {
          id: 'filter_1749626300526_hwumpmee4',
          events: [
            {
              id: 'event_1749626300526',
              conceptSet: 'Condition Occurrence concept set',
              chips: [],
              criteriaType: 'conditionOccurrence',
            },
            {
              id: 'nested_1749626456178_tg17wt4wa',
              conceptSet: 'Nested Criteria',
              chips: [],
              isEditing: false,
              operator: 'OR',
              criteriaType: 'conditionOccurrence',
              isAttributeBased: true,
              parentEventId: 'event_1749626300526',
              isNested: true,
              nestedEvents: [
                {
                  id: 'nested_child_1749626460392_mg78bpunn',
                  conceptSet: 'Add Condition Occurrence',
                  chips: [],
                  isEditing: false,
                  operator: 'OR',
                  criteriaType: 'conditionOccurrence',
                  isAttributeBased: false,
                  parentEventId: 'nested_1749626456178_tg17wt4wa',
                  isNested: false,
                  nestedEvents: [],
                  nestedOperator: 'AND',
                },
              ],
              nestedOperator: 'AND',
              attributeConfig: {
                id: 'nested',
                name: 'Nested Criteria',
                description: 'Add nested criteria group',
                type: 'nested',
                category: 'criteria-specific',
              },
            },
          ],
          isExpanded: true,
          cardinality: {
            type: 'AT_LEAST', // options: 'exactly', 'atMost', 'atLeast'
            count: 1,
            using: 'ALL',
          },
        },
        {
          id: 'filter_1749626302603_j4uptf11m',
          type: 'inclusion',
          events: [
            {
              id: 'event_1749626302603',
              conceptSet: 'Condition Occurrence concept set',
              chips: [],
              criteriaType: 'conditionOccurrence',
            },
          ],
          isExpanded: true,
          cardinality: {
            type: 'AT_LEAST', // options: 'exactly', 'atMost', 'atLeast'
            count: 1,
            using: 'ALL',
          },
        },
      ],
    },
  ],
}
