// tslint:disable:max-classes-per-file
/**
 * Create a new BooleanContainer.
 * @constructor
 * @param {any} content Container content
 *
 * @classdesc
 * Base Container for boolean Logic.
 * @alias hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer
 */
class BooleanContainer {
  public content: any
  public op: string
  constructor(content?) {
    this.content = content
    this.op = ''
  }
}

/**
 * Create a new And.
 * @constructor
 * @param {any} content Container content
 *
 * @classdesc
 * And Container for boolean Logic.
 * @alias hc.mri.pa.ui.lib.ifr.BooleanContainers.And
 */

class And extends BooleanContainer {
  constructor(content?) {
    super(content)
    this.op = 'AND'
  }

  public accept(visitor) {
    visitor.visitAnd(this.content)
  }
}
/**
 * Create a new Or.
 * @constructor
 * @param {any} content Container content
 *
 * @classdesc
 * Or Container for boolean Logic.
 * @alias hc.mri.pa.ui.lib.ifr.BooleanContainers.Or
 */
class Or extends BooleanContainer {
  constructor(content?) {
    super(content)
    this.op = 'OR'
  }

  public accept(visitor) {
    visitor.visitOr(this.content)
  }
}

/**
 * Create a new Not.
 * @constructor
 * @param {any} content Container content
 *
 * @classdesc
 * Not Container for boolean Logic.
 * @alias hc.mri.pa.ui.lib.ifr.BooleanContainers.Not
 */
class Not extends BooleanContainer {
  constructor(content?) {
    super(content)
    this.op = 'NOT'
  }

  public accept(visitor) {
    visitor.visitNot(this.content)
  }
}

class Empty extends BooleanContainer {
  constructor(content?) {
    super(content)
    this.op = 'EMPTY'
  }

  public accept() {
    return this
  }
}

export default {
  BooleanContainer,
  And,
  Or,
  Not,
  Empty,
}
