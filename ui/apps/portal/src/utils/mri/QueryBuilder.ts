import { BOOLEAN_CONTAINER, LogicalOperator, Column } from "./ifr/Constants";
import { Interaction, CriteriaGroup, ExclusiveFilter, FilterCard } from "./ifr/QueryModel";

interface ConfigData {
  configId: string;
  configVersion: string;
}

interface PatientCountConfigData {
  id: string;
  version: string;
}

export default class QueryBuilder {
  private filters: Array<ExclusiveFilter> = [];
  private interactionInstances: Map<string, number> = new Map();
  private configData?: ConfigData;
  private patientCountConfigData?: PatientCountConfigData;

  constructor(configId?: string, configVersion?: string) {
    if (configId && configVersion) {
      this.configData = { configId, configVersion };
      this.patientCountConfigData = { id: configId, version: configVersion };
    }
  }

  addCriteriaGroup(criteriaGroup: CriteriaGroup): void {
    let hasAdded = false;
    if (criteriaGroup !== undefined) {
      if (criteriaGroup.hasFilters()) {
        hasAdded = true;
        this.addFiltersByCriteriaGroup(criteriaGroup);
      }
      if (criteriaGroup.hasGroups() && criteriaGroup.getLogicalOperator() === LogicalOperator.AND) {
        hasAdded = true;
        criteriaGroup.getGroups().forEach((exclusiveGroup) => {
          this.addFiltersByCriteriaGroup(exclusiveGroup);
        });
      }
    }
    if (!hasAdded) {
      throw new Error("Invalid criteriaGroup is provided!");
    }
  }

  private addFiltersByCriteriaGroup(criteriaGroup: CriteriaGroup): void {
    if (criteriaGroup.getLogicalOperator() === LogicalOperator.OR) {
      const exclusiveFilter = new ExclusiveFilter(criteriaGroup.getFilters());
      this.filters.push(exclusiveFilter);
      exclusiveFilter.getCards().forEach((filter) => {
        this.setInstanceNumber(filter);
      });
    } else if (criteriaGroup.getLogicalOperator() === LogicalOperator.AND) {
      criteriaGroup.getFilters().forEach((filter) => {
        this.setInstanceNumber(filter);
        this.filters.push(new ExclusiveFilter([filter]));
      });
    }
  }

  setInstanceNumber(filterCard: FilterCard): void {
    const configPath = filterCard.getConfigPath();
    const interactionInstances = this.interactionInstances;
    if (filterCard instanceof Interaction) {
      const count = interactionInstances.get(configPath);
      if (count) {
        interactionInstances.set(configPath, count! + 1!);
      } else {
        interactionInstances.set(configPath, 1);
      }
    }
    filterCard.setInstanceNumber(interactionInstances.get(configPath)!);
  }

  cohortDefinition(
    columns: Array<Column>,
    studyEntityValue?: string
  ): {
    cohortDefinition: {
      cards: {
        content: any[];
        type: string;
        op: LogicalOperator;
      };
      configData: ConfigData;
      axes: never[];
      guarded: boolean;
      offset: number;
      columns: Column[];
    };
    datasetId: string;
  } {
    const content: Array<any> = [];
    this.filters.forEach((filterContent) => {
      content.push(filterContent.req_obj());
    });
    return {
      cohortDefinition: {
        cards: {
          content: content,
          type: BOOLEAN_CONTAINER,
          op: LogicalOperator.AND,
        },
        configData: this.configData || ({} as ConfigData),
        axes: [],
        guarded: true,
        offset: 0,
        columns: columns,
      },
      datasetId: studyEntityValue ? studyEntityValue : "",
    };
  }

  studiesPatientCountDefinition(studyEntityValue: Array<string>): {
    filter: {
      configMetadata: any;
      cards: {
        content: any[];
        type: string;
        op: LogicalOperator;
      };
    };
    axisSelection: never[];
    datasetId: string;
    studies: Array<string>;
  } {
    const content: Array<any> = [{ type: BOOLEAN_CONTAINER, op: LogicalOperator.OR, content: [] }];
    return {
      filter: {
        configMetadata: {},
        cards: {
          content,
          type: BOOLEAN_CONTAINER,
          op: LogicalOperator.AND,
        },
      },
      axisSelection: [],
      datasetId: "",
      studies: studyEntityValue,
    };
  }

  filterDefinition(studyEntityValue: string): {
    filter: {
      configMetadata: PatientCountConfigData;
      cards: {
        content: any[];
        type: string;
        op: LogicalOperator;
      };
    };
    axisSelection: never[];
    datasetId: string;
  } {
    const content: Array<any> = [{ type: BOOLEAN_CONTAINER, op: LogicalOperator.OR, content: [] }];
    return {
      filter: {
        configMetadata: this.patientCountConfigData || ({} as PatientCountConfigData),
        cards: {
          content,
          type: BOOLEAN_CONTAINER,
          op: LogicalOperator.AND,
        },
      },
      axisSelection: [],
      datasetId: studyEntityValue ? studyEntityValue : "",
    };
  }
}
