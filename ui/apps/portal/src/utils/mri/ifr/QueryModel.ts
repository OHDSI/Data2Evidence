import { BOOLEAN_CONTAINER, LogicalOperator, ComparisonOperator, CardType } from "./Constants";

const DOT = ".";

export class Expression {
  type: "Expression";
  operator: ComparisonOperator;
  value: string;
  constructor(operator: ComparisonOperator, value: string) {
    this.type = "Expression";
    this.operator = operator;
    this.value = value;
  }

  req_obj(): {
    type: "Expression";
    operator: ComparisonOperator;
    value: string;
  } {
    return {
      type: this.type,
      operator: this.operator,
      value: this.value,
    };
  }
}

export class ConstraintGroup {
  expressions: Array<Expression>;
  op: LogicalOperator | undefined;

  constructor() {
    this.expressions = [];
  }

  matchAll(expressions: Array<Expression>): void {
    if (this.expressions.length > 0) {
      throw new Error("ConstraintGroup already has expressions added!");
    } else if (expressions.length === 0) {
      throw new Error("Invalid expressions is provided!");
    }

    this.expressions = expressions;
    this.op = LogicalOperator.AND;
  }

  matchAny(expressions: Array<Expression>): this {
    if (this.expressions.length > 0) {
      throw new Error("ConstraintGroup already has expressions added!");
    } else if (expressions.length === 0) {
      throw new Error("Provided expressions is empty!");
    }

    this.expressions = expressions;
    this.op = LogicalOperator.OR;
    return this;
  }

  req_obj(): {
    content: any[];
    type: string;
    op: LogicalOperator | undefined;
  } {
    const content: Array<any> = [];
    this.expressions.forEach((expression) => {
      content.push(expression.req_obj());
    });
    return {
      content: content,
      type: BOOLEAN_CONTAINER,
      op: this.op,
    };
  }
}

export class Attribute {
  private configPath: string;
  private type: "Attribute";
  private constraints: ConstraintGroup;
  constructor(configPath: string, constraints: ConstraintGroup) {
    this.configPath = configPath;
    this.type = "Attribute";
    this.constraints = constraints;
  }

  req_obj(
    cardConfigPath: string,
    cardInstanceId: string
  ): {
    type: "Attribute";
    configPath: string;
    instanceID: string;
    constraints: {
      content: any[];
      type: string;
      op: LogicalOperator | undefined;
    };
  } {
    return {
      type: this.type,
      configPath: cardConfigPath + DOT + this.configPath,
      instanceID: cardInstanceId + DOT + this.configPath,
      constraints: this.constraints.req_obj(),
    };
  }
}

class FilterCard {
  configPath: string;
  instanceNumber: number | undefined;
  private name: string;
  private cardType: CardType;
  private attributes: Array<Attribute>;
  constructor(name: string, configPath: string, cardType?: CardType, instanceNumber?: number) {
    this.name = name;
    this.configPath = configPath;
    this.cardType = cardType || CardType.INCLUDED;
    this.attributes = [];
    if (instanceNumber) {
      this.setInstanceNumber(instanceNumber);
    }
  }

  addAttribute(attribute: Attribute): this {
    this.attributes.push(attribute);
    return this;
  }

  getConfigPath(): string {
    return this.configPath;
  }

  getInstanceId(): string {
    return this.getConfigPath();
  }

  setInstanceNumber(instanceNumber: number): void {
    if (!this.instanceNumber) {
      this.instanceNumber = instanceNumber;
    }
  }

  req_obj(): any {
    const content: Array<any> = [];
    this.attributes.forEach((attribute) => {
      content.push(attribute.req_obj(this.configPath, this.getInstanceId()));
    });

    const req_obj = {
      type: "FilterCard",
      inactive: false,
      name: this.name,
      configPath: this.configPath,
      instanceID: this.getInstanceId(),
      attributes: {
        content: content,
        type: BOOLEAN_CONTAINER,
        op: LogicalOperator.AND,
      },
    };
    if (this.cardType === CardType.INCLUDED) {
      return req_obj;
    } else if (this.cardType === CardType.EXCLUDED) {
      return {
        content: [req_obj],
        type: BOOLEAN_CONTAINER,
        op: "NOT",
      };
    } else {
      throw new Error("Invalid cardType is provided!");
    }
  }
}

export class Patient extends FilterCard {
  constructor(cardType?: CardType) {
    super("Basic Data", "patient", cardType, 0);
  }
}

export class Interaction extends FilterCard {
  override getInstanceId(): string {
    return this.configPath + DOT + this.instanceNumber;
  }
}

export class CriteriaGroup {
  private op: LogicalOperator | undefined;
  private filters: Array<FilterCard>;
  private groups: Array<CriteriaGroup>;
  constructor() {
    this.filters = [];
    this.groups = [];
  }

  matchAllFilters(filters: Array<FilterCard>): this {
    if (this.filters.length > 0) {
      throw new Error("CriteriaGroup already has filters added!");
    } else if (filters.length === 0) {
      throw new Error("Invalid filters is provided!");
    }

    this.filters = filters;
    this.op = LogicalOperator.AND;
    return this;
  }

  matchAllGroups(groups: Array<CriteriaGroup>): this {
    if (this.groups.length > 0) {
      throw new Error("CriteriaGroup already has groups added!");
    } else if (groups.length === 0) {
      throw new Error("Invalid groups is provided!");
    }

    this.groups = groups;
    this.op = LogicalOperator.AND;
    return this;
  }

  matchAnyFilters(filters: Array<FilterCard>): this {
    if (this.filters.length > 0) {
      throw new Error("CriteriaGroup already has filters added!");
    } else if (filters.length === 0) {
      throw new Error("Invalid filters is provided!");
    }

    this.filters = filters;
    this.op = LogicalOperator.OR;
    return this;
  }

  hasFilters(): boolean {
    return this.filters.length > 0;
  }

  hasGroups(): boolean {
    return this.groups.length > 0;
  }

  getFilters(): FilterCard[] {
    return this.filters;
  }

  getGroups(): CriteriaGroup[] {
    return this.groups;
  }

  getLogicalOperator(): LogicalOperator | undefined {
    return this.op;
  }
}

class ExclusiveFilter {
  private cards: Array<FilterCard>;
  constructor(cards?: Array<FilterCard>) {
    this.cards = cards || [];
  }
  getCards(): FilterCard[] {
    return this.cards;
  }
  req_obj(): {
    content: any[];
    type: string;
    op: LogicalOperator;
  } {
    const content: Array<any> = [];
    this.cards.forEach((card) => {
      content.push(card.req_obj());
    });
    return {
      content: content,
      type: BOOLEAN_CONTAINER,
      op: LogicalOperator.OR,
    };
  }
}

export { ExclusiveFilter, FilterCard, LogicalOperator };
