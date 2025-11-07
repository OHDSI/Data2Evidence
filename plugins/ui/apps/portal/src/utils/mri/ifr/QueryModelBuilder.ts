import { CriteriaGroup, Patient, Interaction, Attribute, ConstraintGroup, Expression } from "./QueryModel";
import { CardType, ComparisonOperator, Column } from "./Constants";

export default class QueryModelBuilder {
  patient(cardType?: CardType): Patient {
    return new Patient(cardType);
  }

  interaction(name: string, configPath: string, cardType?: CardType): Patient {
    return new Interaction(name, configPath, cardType);
  }

  criteriaGroup(): CriteriaGroup {
    return new CriteriaGroup();
  }

  attribute(configPath: string, constraintGroup: ConstraintGroup): Attribute {
    return new Attribute(configPath, constraintGroup);
  }

  constraintGroup(): ConstraintGroup {
    return new ConstraintGroup();
  }

  expression(operator: ComparisonOperator, value: string): Expression {
    return new Expression(operator, value);
  }

  columns(columnConfigPaths: Array<string>): Array<Column> {
    let seqCount = 0;
    const columns: Array<Column> = [];
    columnConfigPaths.forEach((configPath) => {
      columns.push({
        configPath: configPath,
        order: "",
        seq: seqCount,
      });
      seqCount += 1;
    });
    return columns;
  }
}
