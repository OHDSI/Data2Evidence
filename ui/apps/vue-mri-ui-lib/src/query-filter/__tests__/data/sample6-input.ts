export default {
  id: 'criteria_1749645393216_hwumpmeea',
  criteriaType: 'ALL', // options: 'ALL', 'EARLIEST', 'LATEST'
  criteria: [
    {
      id: 'group_1749645393216_hwumpmeet',
      title: 'Group 1',
      description: 'Description 1',
      groupType: 'ALL', // options: 'ALL', 'ANY', 'AT_LEAST', 'AT_MOST'
      groups: [
        {
          id: 'filter_1749645393216_xvxxylsat',
          events: [
            {
              id: 'event_1749645393216',
              conceptSet: 'Condition Occurrence concept set',
              chips: [],
              criteriaType: 'conditionOccurrence',
            },
            {
              id: 'attr_1749645396408_nusze56wu',
              conceptSet: 'Age',
              chips: [],
              isEditing: false,
              operator: 'OR',
              criteriaType: 'conditionOccurrence',
              isAttributeBased: true,
              parentEventId: 'event_1749645393216',
              attributeConfig: {
                id: 'age',
                name: 'Age',
                description: 'Filter by age at time of diagnosis',
                type: 'numericRange',
                category: 'criteria-specific',
              },
            },
            {
              id: 'nested_1749645404137_t4xpvfdif',
              conceptSet: 'Nested Criteria',
              chips: [],
              isEditing: false,
              operator: 'OR',
              criteriaType: 'conditionOccurrence',
              isAttributeBased: true,
              parentEventId: 'event_1749645393216',
              isNested: true,
              nestedEvents: [
                {
                  id: 'nested_child_1749645411779_3nmhb8bu1',
                  conceptSet: 'Condition Occurrence',
                  chips: [],
                  isEditing: false,
                  operator: 'OR',
                  criteriaType: 'conditionOccurrence',
                  isAttributeBased: false,
                  parentEventId: 'nested_1749645404137_t4xpvfdif',
                  isNested: false,
                  nestedEvents: [],
                  nestedOperator: 'AND',
                },
                {
                  id: 'attr_1749645414135_ne2e9mf0o',
                  conceptSet: 'Age',
                  chips: [],
                  isEditing: false,
                  operator: 'OR',
                  criteriaType: 'conditionOccurrence',
                  isAttributeBased: true,
                  parentEventId: 'nested_child_1749645411779_3nmhb8bu1',
                  attributeConfig: {
                    id: 'age',
                    name: 'Age',
                    description: 'Filter by age at time of diagnosis',
                    type: 'numericRange',
                    category: 'criteria-specific',
                  },
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
      ],
    },
  ],
}
