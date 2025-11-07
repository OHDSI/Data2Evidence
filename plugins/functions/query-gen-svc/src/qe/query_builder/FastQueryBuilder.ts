// tslint:disable:max-classes-per-file
/**
 * Recursive checking of javascript object properties and filter them out if they are null or undefined.
 * @param obj  Javascript object / Array to be scanned and filtered.
 * @returns    Filtered javascript object.
 */
function filterProperties(obj: Object): Object {
    obj = JSON.parse(JSON.stringify(obj));
    let r = {};
    for (let x in obj) {
        if (obj[x]) {
            if (obj[x] instanceof Array) {

                let temp = [];
                obj[x].forEach( (elem) => {
                    temp.push(filterProperties(elem));
                });

                r[x] = temp;

            } else if (typeof obj[x] === "object") {
                r[x] = filterProperties(obj[x]);
            } else {
                r[x] = obj[x];
            }
        }
    }
    return r;
}

/**
 * Convert the given javascript object to Json with 3 tab spaces.
 * @param obj  Javascript object to be converted.
 * @returns    Json
 */
function convertToJson(obj: Object): string {
    return JSON.stringify(obj, null, 3);
}


/**
Recursive checking of javascript object properties and throw error if they are null

function genericValidationObjectProperties(obj) {
      var errors = [];
      var className = obj.constructor.name ? obj.constructor.name : (obj instanceof Array ? "Array" : "Object");
      if (!obj) throw new Error("Object is undefined");

      if (obj instanceof Array) {

          obj.forEach((element) =>{
             genericValidationObjectProperties(element); //Recursive call to inspect the each object of the Array
          });

      } else if (typeof obj === "object") {
           Object.keys(obj).forEach((property) => {
                var type = typeof obj[property];
                var value = obj[property];
                switch (type) {
                    case "object":
                        if (obj[property] instanceof Array && (!value || value.length === 0)) { //Check for type Array
                            errors.push(property + " Cannot be empty in " + className);
                            break;
                        }
                    case "string":
                    default:
                        if (!value) errors.push(property + " Cannot be empty in " + className); //For all other types
                }

               if (obj[property]) {

                    if (obj[property] instanceof Array) {

                        obj[property].forEach((element) =>{
                           genericValidationObjectProperties(element); //Recursive call to inspect the properties of the object
                        });

                    } else if (typeof obj[property] === "object") {
                        genericValidationObjectProperties(obj[property]); //Recursive call to inspect the properties of the object

                    }
               }
          });
      }

      if (errors.length > 0) throw new Error(errors.join("\n"));
}

*/

/*function genericTempCleanup(obj) {
      console.log("inside...");
      console.log(Object.keys(obj));
      var tempProperties = [];
      for(var prop in obj){
        if(obj[prop] instanceof Temp){
          tempProperties.push(prop);
        }
      }

        for(var i = 0; i < tempProperties.length; i++){
            delete obj[tempProperties[i]];
        }
 }

export class Temp{

} */

/**
 * This class is usually extended by other classes as it has basic helper methods.
 */
export class FastElement implements Utils {

    /**
    * Converts the "this" Object to json.
    * @returns      Converted json. Uses the convertToJson method internally in this implementation.
    */
    toJson(): string {
        this.validate();
        return convertToJson(this);
    }

    /**
     * Validates the "this" Object to json. Throw an error if any of the validations fails.
     */
    validate(): void {
        // genericValidationObjectProperties(filterProperties(this)); //for now commenting this

    }
}

/**
 * This interface has basic helper methods needed for every javascript object.
 */
export interface Utils {

    /**
    * Validates the "this" Object to json. Throw an error if any of the validations fails.
    */
    validate(): void;

    /**
    * Converts the "this" Object to json.
    * @returns      Converted json.
    */
    toJson(): string;
}

/**
 * This class is a representation of a basic expression.
 */
export class Expression extends FastElement {

    /**
     * Initialize a new expression object.
     * @param type      Type of expression.
     */
    constructor(protected type: string) {
        super();
    }

    /**
     * Static method that returns a new DurationBetween Expression object.
     * @returns         Newly instantiated DurationBetween Object.
     */
    static durationBetween(): DurationBetween {
        return new DurationBetween();
    }
}

/**
 * This class just holds the collection of all the definition statements.
 */
export class Statement extends FastElement {
    private def: Definition[];

    /**
     * Initialize a new statement object.
     * @param definition      Optional parameter of defintions array.
     */
    constructor(definition?: Definition[]) {
        super();
        this.def = definition ? definition : [];
    }

    /**
    * Creates a Definition Object
    * @param name      Definition name.
    * @returns         Newly instantiated Definition Object.
    */
    definition(name: string): Definition {
        let definition = new Definition(name);
        this.def.push(definition);
        return definition;
    }


    /**
    * Returns the array of defitions stored.
    * @returns         Array of definitions.
    */
    getDefintions(): Definition[] {
        return this.def;
    }

    /**
    * Converts the "this" Object to json.
    * @returns      Converted json. Uses the convertToJson method internally in this implementation.
    */
    toJson() {
        this.validate();
        return convertToJson({ statement: this });

        /*JSON.stringify({
            statement: {
                def: this.def.map(x => x.toJson())
            }
        }); */
    }

    /**
     * Recursive checking of the "this" object properties and filter them out if they are null or undefined.
     * Internally uses the global filterProperties method.
     * @returns    Filtered javascript object.
     */
    filterObject(): Object {
        return filterProperties(this);
    }
}

/**
 *  This class represents a single definition (for each "define" statment in cql) which contains a query for data retrieval
 *  from one or more entities.
 *  Structure of Definition :
 *                        Query / SXor / Union
 */
export class Definition extends FastElement {
    private expression: Query | SXor | Union = null;

    /**
    * Initialize a new Definition object.
    * @param name              Definition name.
    * @param expressionType    Type of root expression the definition will contain.
    * @param context           Context of the Definition. By default it is patient. Other possible value is population.
    * @param accessLevel       Possible values are public or private. Whether this definition can be referred in other definitions,
    *                          defined in other files.
    */
    constructor(private name: string, expressionType: string = "Query", private context: string = "patient", private accessLevel: string = "public") {
        super();

        if (!expressionType) {
            throw new Error("Expression Type cannot be empty!");
        } else if (expressionType === "Query") {
            this.expression = this.query();
        } else if (expressionType === "sXor") {
            this.expression = this.sXOR();
        } else if (expressionType === "Union") {
            this.expression = this.union();
        }
    }

    /**
     * Instantiates a new object of query and returns it
     * @returns    new query expression object
     */
    private query(): Query {
        if (this.expression) {
            throw new Error("expression already set");
        }
        return new Query();
    }

    /**
    * Instantiates a new object of Special Xor and returns it.
    * This operation does a full outer join between other definitions in the definition collection.
    * @returns    new SXor expression object
    */
    private sXOR(): SXor {
        if (this.expression) {
            throw new Error("expression already set");
        }
        return new SXor();
    }

    /**
    * Instantiates a new object of Union and returns it.
    * This operation does a full outer join between other definitions in the definition collection.
    * @returns    new SXor expression object
    */
    private union(): Union {
        if (this.expression) {
            throw new Error("expression already set");
        }
        return new Union();
    }

    /**
        * Returns the root expression which could be either Query or SXor type
        * @returns    new Query or SXor expression object
        */
    getExpression(): any {
        return this.expression;
    }

    /**
     * @returns    name of this definition
     */
    getName(): string {
        return this.name;
    }
}

/**
 * This class represents a special xor operation meaning it does a full outer join between the other definitions in the statement collection.
 * For example if there are two definitions namely Definition A and B. In the sql the Sxor query would look like
 * "(Select * from A) FULL OUTER JOIN (Select * from B) ON 1<>1"
 * @returns    new SXor expression object
 */
export class SXor extends Expression {

    private operand: Expression[] = null;

    /**
     * Order by datatypes to be used
     */
    private orderBy: OrderBy[];

    constructor() {
        super("SXor");
        this.operand = [];
        this.orderBy = [];
    }

    /**
    * Add a new expression (with the name of each definition present in the statement collection) to the collection
    * @returns    new SXor expression object
    */
    addOperand(expression: Expression) {
        this.operand.push(expression);
        return this;
    }

    /**
    * Creates and stores the order by (of type OrderBy) item in the group by collection.
    * @param path                Attribute / Property name
    * @param scope               Entity within which the path needs to be looked into
    * @param alias               Specify the attribute including the full path according to the data model config, which is dot(.) separated.
    * @param order               ASC / DESC.
    * @param templateId          Specify the type of data including the full path according to the data model config, which is dash(-) separated.
    * @param axis                If charts related then need to specify if it is x or y axis.
    * @returns                   Current Query object.
    */
    order(path: string, scope: string, alias: string, order: string, templatedId?: string, axis?: string): SXor {
        this.orderBy.push(new OrderBy(path, scope, alias, order, templatedId, axis));
        return this;
    }
}

/**
* This class represents a Union operation
* @returns    new Union expression object
*/
export class Union extends Expression {
    private operand: Expression[] = null;

    /**
     * Order by datatypes to be used
     */
    private orderBy: OrderBy[];

    constructor() {
        super("Union");
        this.operand = [];
        this.orderBy = [];
    }

    /**
    * Add a new expression (with the name of each definition present in the statement collection) to the collection
    * @returns    new Union expression object
    */
    addOperand(expression: Expression) {
        this.operand.push(expression);
        return this;
    }

    /**
     * Creates and stores the order by (of type OrderBy) item in the group by collection.
     * @param path                Attribute / Property name
     * @param scope               Entity within which the path needs to be looked into
     * @param alias               Specify the attribute including the full path according to the data model config, which is dot(.) separated.
     * @param order               ASC / DESC.
     * @param templateId          Specify the type of data including the full path according to the data model config, which is dash(-) separated.
     * @param axis                If charts related then need to specify if it is x or y axis.
     * @returns                   Current Query object.
     */
    order(path: string, scope: string, alias: string, order: string, templatedId?: string, axis?: string): Union {
        this.orderBy.push(new OrderBy(path, scope, alias, order, templatedId, axis));
        return this;
    }
}

/**
* This class has all the nitty gritty details that a query usually consists of for fetching data. Source, relationship,
* conditions, group by.
*    Structure of Query Expression :
*                              Retrieve / Reference
*                              Relationship
*                              where
*                              groupby
*/
export class Query extends Expression {
    /**
    * Source of the entity for which data needs to be fetched.
    */
    private source: any[];

    /**
    * Relationship defines the other entities involved for fetching data from them as well.
    */
    private relationship: Join[];

    /**
    * Where represents the condition for filtering the data
    */
    private where: Expression = null;

    /**
    * Group by in this context not only groups the data as per the fields / properties specified but also
    * that these fields are automatically included as part of the "Select" clause as well. Meaning these are the fields for
    * which data will be retrieved.
    */
    private groupBy: Property[];

    /**
     * Order by datatypes to be used
     */
    private orderBy: OrderBy[];

    constructor() {
        super("Query");
        this.source = [];
        this.groupBy = [];
        this.orderBy = [];
    }

    /**
    * Creates a source object and stores the reference expression inside the source.
    * @param alias    alias for the source entity.
    * @param name     Name of the expression to be referenced.
    * @returns        Current Query object.
    */
    reference(name: string): Query {
        this.source.push(new Reference(name));
        return this;
    }


    /**
    * Creates a source object and stores the retrieve expression inside the source.
    * @param alias    alias for the source entity.
    * @param dataType       Type of data to be fetched.
    * @param templateId     entity name usually with the full path and dash(-) separated as per the data model config.
    * @returns              Current Query object.
    */
    retrieve(alias: string, dataType: string, templateId: string): Query {
        let oSource = new Source(alias);
        oSource.expression = new Retrieve(dataType, templateId); // take the last object in the array
        this.source.push(oSource);
        return this;
    }

    /**
      * Creates and stores the group by (of type Property) item in the group by collection.
      * @param path                Attribute / Property name
      * @param scope               Entity within which the path needs to be looked into
      * @param alias               Specify the attribute including the full path according to the data model config, which is dot(.) separated.
      * @param templateId          Specify the type of data including the full path according to the data model config, which is dash(-) separated.
      * @returns                   Current Query object.
      */
    group(path: string, scope: string, alias: string, templatedId?: string): Query {
        this.groupBy.push(new Property(path, scope, alias, templatedId));
        return this;
    }

    /**
   * Creates and stores the order by (of type OrderBy) item in the group by collection.
   * @param path                Attribute / Property name
   * @param scope               Entity within which the path needs to be looked into
   * @param alias               Specify the attribute including the full path according to the data model config, which is dot(.) separated.
   * @param order               ASC / DESC.
   * @param templateId          Specify the type of data including the full path according to the data model config, which is dash(-) separated.
   * @param axis                If charts related then need to specify if it is x or y axis.
   * @returns                   Current Query object.
   */
    order(path: string, scope: string, alias: string, order: string, templatedId?: string, axis?: string): Query {
        this.orderBy.push(new OrderBy(path, scope, alias, order, templatedId, axis));
        return this;
    }

    /**
       * Stores the With type item in the relationship collection. Having this along with join method for backward compatibility
       * @param oWith          With object.
       * @returns              Current Query object.
       */
    with(oWith: Join): Query {
        if (!this.relationship) {
            this.relationship = [];
        }
        this.relationship.push(oWith);
        return this;
    }

    /**
  * Stores the With type item in the relationship collection.
  * @param oWith          With object.
  * @returns              Current Query object.
  */
    join(oJoin: Join): Query {
        if (!this.relationship) {
            this.relationship = [];
        }
        this.relationship.push(oJoin);
        return this;
    }

    /**
       * Contains the where clause details and it is of base type expression
       * @param oWith          Expression type object.
       * @returns              Current Query object.
       */
    whereClause(expression: Expression): Query {
        if (this.where) {throw new Error("Where clause already set"); }
        this.where = expression;
        return this;
    }
}


/**
 * Retrieve class contains the basic information regarding the main source entity from which the data needs to be retrieved.
 */
export class Retrieve extends Expression {

    /**
    * Initializes the retrieve object.
    * @param dataType            Specify the type of data according to the data model config.
    * @param templateId          Specify the type of data including the full path according to the data model config, which is dash(-) separated.
    */
    constructor(private dataType: string, private templateId: string) {
        super("Retrieve");
    }
}

/**
 * Reference class contains the name of another defintion defined elsewhere as an expression that is used within the current definition.
 */
export class Reference extends Expression {

    /**
    * Initializes the Reference object.
    * @param name            Specify the name of another definition for reuse
    */
    constructor(private name: string) {
        super("ExpressionRef");
    }
}

/**
 * This class encapsulates the information regarding the "Reference" or "Retrieve" expression along with an alias.
 */
export class Source {

    /**
     * Initializes the Source object.
     * @param alias            Specify an alias that will be used for referencing elsewhere.
     */
    constructor(private alias: string) { }

    /**
     * variable that can store either "Reference" or "Retrieve" expression type.
     */
    expression: Reference | Retrieve = null;

}

/**
* This class describes the information of another entity joining with the source entity.
*    Structure of With (Relationship)  :
*                              Retrieve / Reference
*                              suchThat
*/
export class Join extends Expression {
    /**
     * Details of the entity to be retrieved.
     */
    private expression: Retrieve | Reference;

    /**
     * Describe conditions to be used for filtering.
     */
    private suchThat: Expression;

    /**
    * Initializes the With object.
    * @param alias            Specify an alias that will be used for referencing elsewhere.
    */
    constructor(type: string, private alias: string) {
        super(type);
    }

    /**
     * Store the expression object
     * @param   suchThat        Expression that contains the filtering information
     * @returns                 Current With object
     */
    suchThatClause(suchThat: Expression): Join {
        if (this.suchThat) {throw new Error("suchThat exists already!"); }
        this.suchThat = suchThat;
        return this;
    }

    /**
     * Store the Retrieve object
     * @param dataType            Specify the type of data according to the data model config.
     * @param templateId          Specify the type of data including the full path according to the data model config, which is dash(-) separated.
     * @returns                   Current With object
    */
    retrieve(dataType: string, templateId: string): Join {
        if (this.expression) {throw new Error("Expression exists already!"); }
        this.expression = FastQueryBuilder.retrieve(dataType, templateId);
        return this;
    }

    /**
    * Stores the reference expression.
    * @param name     Name of the expression to be referenced.
    * @returns        Current With object.
    */
    reference(name: string): Join {
        if (this.expression) {throw new Error("Expression exists already!"); }
        this.expression = new Reference(name);
        return this;
    }
}


/**
* This class represents an element that is in conjunction with an operator in an expression
*/
export class Operand extends Expression {
    constructor(type: string) {
        super(type);
    }

    /**
      * Creates and returns the Property object
      * @param path                Attribute / Property name
      * @param scope               Entity within which the path needs to be looked into
      * @param alias               Specify the attribute including the full path according to the data model config, which is dot(.) separated.
      * @param templateId          Specify the type of data including the full path according to the data model config, which is dash(-) separated.
      * @returns                   New property object
     */
    static property(path: string, scope: string, alias: string, templateId?: string): Property {
        return new Property(path, scope, alias, templateId);
    }

    /**
       * Creates and returns the Literal object
       * @param valueType           Standard Types such as string, integer.
       * @param value               Actual value
       * @returns                   New literal object
      */
    static literal(valueType: string, value: string): Literal {
        return new Literal(valueType, value);
    }

}

/**
* This class represents an element that is used along with an operator in an expression, usually an attribute which will be checked against a value or another
* attribute.
*/
export class Property extends Operand {

    /**
     * Initializes the Property object
     * @param path                Attribute / Property name
     * @param scope               Entity within which the path needs to be looked into
     * @param alias               Specify the attribute including the full path according to the data model config, which is dot(.) separated.
     * @param templateId          Specify the type of data including the full path according to the data model config, which is dash(-) separated.
     */
    constructor(protected path: string, protected scope: string, protected alias: string, protected templateId?: string) {
        super("Property");
    }
}

/**
 * This class represents an element that is used along with an operator in an expression, usually an attribute which will be checked against a value or another
 * attribute.
 */
export class OrderBy extends Property {

    /**
     * Initializes the Property object
     * @param path                Attribute / Property name
     * @param scope               Entity within which the path needs to be looked into
     * @param alias               Specify the attribute including the full path according to the data model config, which is dot(.) separated.
     * @param order               ASC / DESC.
     * @param templateId          Specify the type of data including the full path according to the data model config, which is dash(-) separated.
     * @param axis                If charts related then need to specify if it is x or y axis.
     */
    constructor(protected path: string, protected scope: string, protected alias: string, protected order: string, protected templateId?: string,
                protected axis?: string) {
        super(path, scope, alias, templateId);
    }
}

//Like Start, End
/**
 * This class is a special kind of operand, which is collection of Property Objects.
 */
export class TypeOperand extends Operand {
    operand: Property[];

    /** Initializes the TypeOperand object, creates and stores the property object into its collection.
     * @param path                Attribute / Property name
     * @param scope               Entity within which the path needs to be looked into
     * @param alias               Specify the attribute including the full path according to the data model config, which is dot(.) separated.
     * @param templateId          Specify the type of data including the full path according to the data model config, which is dash(-) separated.
     */
    constructor(type: string, path: string, scope: string, alias: string, templateId?: string) {
        super(type);
        this.operand = [];
        this.operand.push(new Property(path, scope, alias, templateId));
    }

    /**
     * Adds a property object to collection
     * @param oOperand           Property Object
     * @returns                  Current TypeOperand object
     */
    addOperand(oOperand: Property): TypeOperand {
        this.operand.push(oOperand);
        return this;
    }

    /**
     * Validates the collection
     */
    validate() {
        if (!this.operand || this.operand.length === 0) {throw new Error("Operand must exists for TypeOperand"); }
    }

}


/**
* This class represents the information of the actual value that will be used in an expression
*/
export class Literal extends Operand {

    /** Initializes the Literal object
     * @param valueType           Type of the actual value such as string, integer
     * @param value               Actual value
    */
    constructor(private valueType: string, private value: string) {
        super("Literal");
    }
}

/**
* This class is another type of expression that evaluates to a boolean value.
*/
export class BoolExpr extends Expression {
    protected operand: (BoolExpr | Operand)[];

    /** Initializes the BoolExpr object
    * @param type           Operator type such as >, <, >=, And, or
    */
    constructor(type: string) {
        super(type);
        this.operand = [];
    }

    /**
     * Instantiates and returns a new Logical object
     * @param type           Logical operator type such as And, or.
     * @returns              Logical object
    */
    static logical(type: string): Logical {
        return new Logical(type);
    }

    /**
     * Instantiates and returns a new Compare object
     * @param type           Compare operator type such as <, >
     * @returns              Compare object
    */
    static compare(type: string): Compare {
        return new Compare(type);
    }

    /**
     * Instantiates and returns a new IsNull object
     * @param type           Property / Attribute
     * @returns              IsNull object
     */
    static isNull(type: Property): IsNull {
        return new IsNull(type);
    }

}

/**
* This class represents comparison operators such as ">", "<", "=".
* This class is a type of boolen expression that evaluates to a boolean value.
* Both left side and the right side operands must be populated.
*/
export class Compare extends BoolExpr {
    constructor(type: string) {
        super(type);
        if (!type) {throw new Error("Compare Type Expression cannot be empty"); }
    }

    /**
      * Stores the operand / expression to the left side of this parent expression
      * @param operandLeft        Could be boolean expression / operand type Object
      * @returns                  Current Compare object
     */
    LHS(operandLeft: BoolExpr | Operand) {
        this.operand[0] = operandLeft;
        return this;
    }

    /**
      * Stores the operand / expression to the right side of this parent expression
      * @param operandRight        Could be boolean expression / operand type Object
      * @returns                   Current Compare object
     */
    RHS(operandRight: BoolExpr | Operand) {
        this.operand[1] = operandRight;
        return this;
    }

    /**
     * Validates if both left and right expression objects are available for comparison
    */
    validate() {
        if (this.operand.length === 0) {throw new Error("Operands does not exists for Compare"); }
        if (!this.operand[0]) {throw new Error("Operand on LHS does not exists for Compare"); }
        if (!this.operand[1]) {throw new Error("Operand on RHS does not exists for Compare"); }
    }

}


/**
* This class represents comparison operators such as ">", "<", "=".
* This class is a type of boolen expression that evaluates to a boolean value.
* Both left side and the right side operands must be populated.
*/
export class IsNull extends BoolExpr {

    constructor(operand: Property) {
        super("IsNull");
        this.operand[0] = operand;
    }

    /**
     * Validates if property operand is available for null check
    */
    validate() {
        if (this.operand.length === 0) {throw new Error("Operand does not exists for IsNull"); }
    }

}

/**
* This class is a type of expression that calculates the difference between the start and the end attributes.
* Both start and end should be populated using the respective methods.
*/
export class DurationBetween extends Expression {
    //operand: [Start, Type]; // This is a tuple type
    operand: TypeOperand[];
    constructor() {
        super("DurationBetween");
        this.operand = [];
    }

    /**
         * Stores the TypeOperand as the start attribute
         * @param path                Attribute / Property name
         * @param scope               Entity within which the path needs to be looked into
         * @param alias               Specify the attribute including the full path according to the data model config, which is dot(.) separated.
         * @param templateId          Specify the type of data including the full path according to the data model config, which is dash(-) separated.
        */
    start(path: string, scope: string, alias: string, templateId?: string): DurationBetween {
        this.operand[0] = new TypeOperand("Start", path, scope, alias, templateId);
        return this;
    }

    /**
         * Stores the TypeOperand as the end attribute
         * @param path                Attribute / Property name
         * @param scope               Entity within which the path needs to be looked into
         * @param alias               Specify the attribute including the full path according to the data model config, which is dot(.) separated.
         * @param templateId          Specify the type of data including the full path according to the data model config, which is dash(-) separated.
        */
    end(path: string, scope: string, alias: string, templateId?: string): DurationBetween {
        this.operand[1] = new TypeOperand("End", path, scope, alias, templateId);
        return this;
    }

    /**
     * Validates if both start and end attributes are present in the current expression object for evaluation.
    */
    validate() {
        if (this.operand.length === 0) {throw new Error("Operands does not exists for DurationBetween"); }
        if (!this.operand[0]) {throw new Error("Start Operand does not exists for DurationBetween"); }
        if (!this.operand[1]) {throw new Error("End Operand does not exists for DurationBetween"); }
    }
}

/**
* This class represents Logical operators such as "And", "or", "Not".
* It is a type of boolen expression that evaluates to a boolean value. Must have minimum two operands in the collection.
*/
export class Logical extends BoolExpr {
    constructor(type: string) {
        super(type);

        if (!type) {throw new Error("Logical Operator cannot be empty"); }
        //if (!operand1) throw new Error("Operand 1 cannot be empty");
        //if (!operand2) throw new Error("Operand 2 cannot be empty");

        this.operand = [];
    }

    /**
      * Stores the boolean expression to collection
      * @param operand        Boolean expression type Object.
      * @returns              Current Logical object.
     */
    addOperand(operand: BoolExpr) {
        this.operand.push(operand);
        return this;
    }

    /**
     * Validates if minimum two operands are available for evaluation.
    */
    validate() {
        if (this.operand.length === 0) {throw new Error("Operands does not exists for Logical"); }
        if (!this.operand[0]) {throw new Error("Operand on LHS does not exists for Logical"); }
        if (!this.operand[1]) {throw new Error("Operand on RHS does not exists for Logical"); }
    }

}

/**
 * Fast Query Builder is the main class which is used to build the FAST Object Class and create instances of other Classes.
 */
export class FastQueryBuilder {

    /**
    * A Statement Object and later used as a container to store child objects.
    * This object finally will be converted to FAST Json.
    */
    private statement: Statement;

    constructor() {
        this.statement = new Statement();
    }

    /**
     * Returns the raw Fast Object without being processed further (ex: filtering)
     * @returns         Statement Object
     */
    getStatement(): Statement {
        return this.statement;
    }

    /**
    * Creates a Definition Object
    * @param name              Definition name.
    * @param expressionType    Either "Query"" or "sXor" or "Union" expression type. It is Query by default, if no name is passed.
    * @returns                 Query or SXor or Union Type
    */
    definition(name: string, expressionType?: string): any {
        let removeSpaceName = name.replace(/ /g, "_");
        let oDefinition = new Definition(removeSpaceName, expressionType);
        this.statement.getDefintions().push(oDefinition);
        return oDefinition.getExpression();
    }

    /**
    * Creates a Retrieve Object
    * @param dataType      Datatype of the entity to be retrieved.
    * @param templateId    TemplateId / path of the entity to be retrieved. In case of current data model config the full path is dash(-) separated.
    * @returns             Newly instantiated Retrieve Object.
    */
    static retrieve(dataType: string, templateId: string): Retrieve {
        return new Retrieve(dataType, templateId);
    }

    /**
    * Creates a Reference Object
    * @param name      Reference name.
    * @returns         Newly instantiated Reference Object.
    */
    static ref(name: string): Reference {
        return new Reference(name);
    }

    /**
    * Creates a With Object
    * @param alias     Reference name.
    * @returns         Newly instantiated With Object.
    */
    static with(alias: string): Join {
        return new Join("With", alias);
    }

    /**
     * Creates a Left Join Object
     * @param alias     Reference name.
     * @returns         Newly instantiated Left Join Object.
     */
    static leftJoin(alias: string): Join {
        return new Join("LeftJoin", alias);
    }

    /**
    * Creates a Right Join Object
    * @param alias     Reference name.
    * @returns         Newly instantiated Right Join Object.
    */
    static rightJoin(alias: string): Join {
        return new Join("RightJoin", alias);
    }

    /**
    * Converts all the definitions to FAST Json
    * @returns         FAST Json.
    */
    getFastJson(): string {
        let oFilteredStatement = this.getFast();
        return convertToJson(oFilteredStatement);
    }

    /**
     * Returns the Fast Object after filtering null values and formatting it to the FAST format.
     * @returns         FAST Object
     */
    getFast(): Object {
        return { statement: this.statement.filterObject() };
    }

}
