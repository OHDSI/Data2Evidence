// tslint:disable:max-classes-per-file
// tslint:disable:variable-name
import BooleanContainers from './BooleanContainers'
import InternalFilterRepresentation from './InternalFilterRepresentation'

class DirectBuildContainer {
  public content: any
  constructor() {
    this.content = null
  }

  public build() {
    if (this.content !== null) {
      return this.content.build()
    }
    return new BooleanContainers.Empty()
  }

  public add(newContent) {
    if (this.content !== null) {
      throw new Error('Cannot add more than one element!')
    }

    this.content = newContent
  }
}

class WrappedBuildContainer {
  public content: any[]

  public BooleanContainerType: any
  constructor(BooleanContainerType) {
    this.content = []
    this.BooleanContainerType = BooleanContainerType
  }

  public build() {
    const containerContent = this.content.map(element => element.build())

    return new this.BooleanContainerType(containerContent)
  }

  public add(newContent) {
    this.content.push(newContent)
  }
}

class AndContainer extends WrappedBuildContainer {
  constructor() {
    super(BooleanContainers.And)
  }
}

class OrContainer extends WrappedBuildContainer {
  constructor() {
    super(BooleanContainers.Or)
  }
}

class NotContainer extends WrappedBuildContainer {
  constructor() {
    super(BooleanContainers.Not)
  }
}

class BaseBuilder {
  public parent: any
  public container: any
  public builderParameters: any
  constructor(parent?, container?) {
    this.parent = parent
    this.container = container || new DirectBuildContainer()
    this.builderParameters = {}
  }

  public addAnd() {
    return this.addContainer(new AndContainer())
  }

  public addOr() {
    return this.addContainer(new OrContainer())
  }

  public addNot() {
    return this.addContainer(new NotContainer())
  }

  public addContainer(newContainer) {
    this.container.add(newContainer)
    return new (this as any).constructor(this, newContainer)
  }

  public setParameters(parameters) {
    this.builderParameters = parameters
    return this
  }

  public up() {
    return this.parent
  }
}

class ExpressionBuilder extends BaseBuilder {
  constructor(parent, operator, value) {
    super(parent, null)
    this.parent = parent
    this.builderParameters = {
      operator,
      value,
    }
  }

  public build() {
    return new InternalFilterRepresentation.Expression({
      operator: typeof this.builderParameters.operator !== 'undefined' ? this.builderParameters.operator : '=',
      value: typeof this.builderParameters.value !== 'undefined' ? this.builderParameters.value : 0,
    })
  }
}

class AttributeBuilder extends BaseBuilder {
  public build() {
    return new InternalFilterRepresentation.Attribute({
      configPath: this.builderParameters.configPath || '',
      instanceID: this.builderParameters.instanceID || '',
      constraints: this.container.build(),
    })
  }

  public addExpression(operation, value) {
    const subBuilder = new ExpressionBuilder(this, operation, value)
    this.container.add(subBuilder)
    return subBuilder
  }
}

class FilterCardBuilder extends BaseBuilder {
  public build() {
    return new InternalFilterRepresentation.FilterCard({
      configPath: this.builderParameters.configPath || '',
      instanceNumber: this.builderParameters.instanceNumber || 0,
      instanceID: this.builderParameters.instanceID || '',
      name: this.builderParameters.name || '',
      successor: this.builderParameters.successor || null,
      advanceTimeFilter: this.builderParameters.advanceTimeFilter || null,
      parentInteraction: this.builderParameters.parentInteraction || '',
      attributes: this.container.build(),
      inactive: this.builderParameters.inactive || false,
      isEntry: this.builderParameters.isEntry || false,
      isExit: this.builderParameters.isExit || false,
    })
  }

  public addAttribute() {
    const subBuilder = new AttributeBuilder(this)
    this.container.add(subBuilder)
    return subBuilder
  }
}

class FilterBuilder extends BaseBuilder {
  public addFilterCard() {
    const subBuilder = new FilterCardBuilder(this)
    this.container.add(subBuilder)
    return subBuilder
  }

  public build() {
    return new InternalFilterRepresentation.Filter({
      configMetadata: this.builderParameters.configMetadata || new InternalFilterRepresentation.ConfigMetadata(),
      cards: this.container.build(),
    })
  }
}

export default FilterBuilder
