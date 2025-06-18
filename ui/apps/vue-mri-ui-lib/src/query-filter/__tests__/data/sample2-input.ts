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

