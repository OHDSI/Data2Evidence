/**
 * MockDb Module
 *
 * @module mockdb
 */

/*
 * Mock result meta-data class.
 */
export function MockResultMetaData(mockDb) {
    this.db = mockDb;
}

MockResultMetaData.prototype.getColumnCount = function () {
    return this.db.columns.length;
};

MockResultMetaData.prototype.getColumnLabel = function (index) {
    return this.db.columns[index - 1].label;
};

MockResultMetaData.prototype.getColumnTypeName = function (index) {
    return this.db.columns[index - 1].type;
};

/*
 * Mock DB result set class. This is what is returned when executing
 * mock statements.
 *
 * The mock DB is passed along to tell the result set what it contains.
 */
export function MockResultSet(mockDb) {
    this.nextCount = 0;
    this.db = mockDb;
}

/*
 * Mocked next() - advance the row counter and returns
 * true or false depending on whether more results are available.
 */
MockResultSet.prototype.next = function () {
    let nextOk = this.nextCount < this.db.content.length ? true : false;
    this.nextCount++;
    return nextOk;
};

/*
 * Get the doulbe at the given index.
 *
 * NB! WIll not throw an error if the value has the wrong type!
 */
MockResultSet.prototype.getMetaData = function () {
    return new MockResultMetaData(this.db);
};

/*
 * Get the integer at the given index.
 *
 * NB! WIll not throw an error if the value has the wrong type!
 */
MockResultSet.prototype.getInteger = function (index) {
    return this._getAny(index);
};

/*
 * Get the doulbe at the given index.
 *
 * NB! WIll not throw an error if the value has the wrong type!
 */
MockResultSet.prototype.getDouble = function (index) {
    return this._getAny(index);
};

/*
 * Get the string at the given index.
 *
 * NB! WIll not throw an error if the value has the wrong type!
 */
MockResultSet.prototype.getString = function (index) {
    return this._getAny(index);
};

/*
 * Private method the return the value at the given index.
 */
MockResultSet.prototype._getAny = function (index) {
    return this.db.content.length === 0 ? null : this.db.content[this.nextCount - 1][index - 1];
};

/*
 * Mock DB statement class. This is what comes back when creating a
 * statement on a mock connection,
 *
 * The SQL to be fired and the mock DB behind it (for what to hand out)
 * are passed as arguments.
 */
export function MockStatement(sql, mockDb) {
    this.db = mockDb;
    this.sql = sql;
    this.params = {};
    this.execParams = [];
    this.resultSets = [];
}

/*
 * Set a statement string parameter.
 */
MockStatement.prototype.setString = function (index, str) {
    this.params[index] = str;
};

/*
 * Set a statement double parameter.
 */
MockStatement.prototype.setDouble = function (index, val) {
    this.params[index] = val;
};

/*
 * Set a statement timrstamp parameter.
 */
MockStatement.prototype.setTimestamp = function (index, val) {
    this.params[index] = val;
};

/*
 * Execute a mock statement (which amounts to just logging the set paramters).
 */
MockStatement.prototype.execute = function () {
    this.execParams.push(this.params);
};

/*
 * Execute a mock statement (which amounts to just logging the set paramters).
 */
MockStatement.prototype.executeQuery = function () {
    this.execParams.push(this.params);
    return this.getResultSet();
};

/*
 * Execute a mock updatement (which amounts to just logging the
 *  set parameters and returning the no. of rows in the mock DB).
 */
MockStatement.prototype.executeUpdate = function () {
    this.execParams.push(this.params);
    return this.db.content.length;
};

/*
 * Return a mock result with the full content of the mock DB.
 */
MockStatement.prototype.getResultSet = function () {
    let newRS = new MockResultSet(this.db);
    this.resultSets.push(newRS);
    return newRS;
};

/*
 * Mock connection class. The mock DB is passed
 * to know which result to return.
 */
export function MockConnection(mockDb) {
    this.db = mockDb;
    this.statementsPrepared = 0;
    this.callsPrepared = 0;
    this.commitsMade = 0;
    this.statements = [];
}

/*
 * Create and log a mock statement against the mock DB.
 */
MockConnection.prototype.prepareStatement = function (sql) {
    this.statementsPrepared++;
    let newStat = new MockStatement(sql, this.db);
    this.statements.push(newStat);
    return newStat;
};

/*
 * Prepare a mock call by logging the mock DB statement and returning it.
 */
MockConnection.prototype.prepareCall = function (sql) {
    this.callsPrepared++;
    let newStat = new MockStatement(sql, this.db);
    this.statements.push(newStat);
    return newStat;
};

/*
* Provide the commit method
*/
MockConnection.prototype.commit = function () {
    this.commitsMade++;
};

/*
 * MockDB class.
 *
 * The constructor argument is the content of the DB:
 * it should be an array of arrays - calls to the mock DB
 * will then return the individual inner arrays as result sets
 * (in the order they were stored).
 */
export function MockDb(content, columns) {
    this.content = (typeof content === "undefined") ? [] : content;
    this.columns = (typeof columns === "undefined") ? [] : columns;
    this.connections = [];
    this.isClosed = false;
}

/*
 * Get a mock connection to this DB
 */
MockDb.prototype.getConnection = function () {
    let con = new MockConnection(this);
    this.connections.push(con);
    return con;
};

/*
 * Convenience function for returniong the full DB content as a
 * mock result set without having to go through connections etc.
 */
MockDb.prototype.backdoorResultSet = function () {
    return new MockResultSet(this);
};
