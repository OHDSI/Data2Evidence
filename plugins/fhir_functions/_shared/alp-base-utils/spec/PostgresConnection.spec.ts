import { PostgresConnection } from "../src/PostgresConnection";
import { Client } from "pg";

describe("PostgresConnection createConnection() returns connection with search_path set", () => {
    const credentials = {
        host: "127.0.0.1",
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: "",
        idle_in_transaction_session_timeout: 5,
    };
    let mockClient: Client;
    beforeEach(() => {
        mockClient = new Client(credentials);
        spyOn(mockClient, "connect").and.callThrough();
        spyOn(mockClient, "query").and.callThrough();
    });
    it("defines PostgresConnection & expects client to be connected & query to set search_path when createConnection is called", (done) => {
        PostgresConnection.createConnection(
            mockClient,
            "MRI",
            (err, connection) => {
                expect(connection).toBeDefined();
                expect(mockClient.connect).toHaveBeenCalledWith();
                expect(mockClient.query).toHaveBeenCalledWith("SET search_path TO MRI;",
                    [], jasmine.any(Function));
                expect(err).toBeNull();
                done();
        });
    });
});

describe("PostgresConnection createConnection() returns error when credentials are invalid", () => {
    const credentials = {
        host: "127.0.0.1",
        port: 5432,
        database: "invalid-database",
        user: "invalid-user",
        password: "invalid-password",
    };
    let mockClient: Client;
    beforeEach(() => {
        mockClient = new Client(credentials);
    });
    it("expects error is be returned when createConnection is called with invalid credentials", (done) => {
        PostgresConnection.createConnection(
            mockClient,
            "MRI",
            (err, connection) => {
                expect(connection).toBeNull();
                expect(err.name).toEqual("MRIDBError");
                done();
        });
    });
});

describe("PostgresConnection createConnection() returns error when client query failed", () => {
    const credentials = {
        host: "127.0.0.1",
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: "",
        idle_in_transaction_session_timeout: 5,
    };
    let mockClient: Client;
    beforeEach(() => {
        mockClient = new Client(credentials);
        spyOn(mockClient, "connect").and.callThrough();
        spyOn(mockClient, "query").and.throwError("Query Error");
    });
    it("expects error is be returned when createConnection is called and client query throws error", (done) => {
        PostgresConnection.createConnection(
            mockClient,
            "MRI",
            (err, connection) => {
                expect(connection).toBeNull();
                expect(mockClient.connect).toHaveBeenCalledWith();
                expect(mockClient.query).toHaveBeenCalledWith("SET search_path TO MRI;",
                    [], jasmine.any(Function));
                expect(err.name).toEqual("MRIDBError");
                expect(err.message).toEqual("Query Error");
                done();
        });
    });
});

describe("PostgresConnection execute(), executeQuery() methods execute provided sql", () => {
    const credentials = {
        host: "127.0.0.1",
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: "",
        idle_in_transaction_session_timeout: 5,
    };
    let conn: PostgresConnection;
    let mockClient: Client;
    beforeEach((done) => {
        mockClient = new Client(credentials);
        spyOn(mockClient, "connect").and.callThrough();
        spyOn(mockClient, "query").and.callThrough();
        PostgresConnection.createConnection(
            mockClient,
            "MRI",
            (err, connection) => {
                conn = connection;
                done();
        });
    });
    it("executes client sql when execute is called", (done) => {
        conn.execute(
            "SELECT current_user;",
            [],
            (err, connection) => {
                expect(connection).toBeDefined();
                expect(mockClient.connect).toHaveBeenCalledWith();
                expect(mockClient.query).toHaveBeenCalledWith("SELECT current_user;",
                    [], jasmine.any(Function));
                expect(err).toBeNull();
                done();
            });
    });

    it("executes client query when executeQuery is called", (done) => {
        conn.executeQuery(
            "SELECT current_user;",
            [],
            (err, connection) => {
                expect(connection).toBeDefined();
                expect(mockClient.connect).toHaveBeenCalledWith();
                expect(mockClient.query).toHaveBeenCalledWith("SELECT current_user;",
                    [], jasmine.any(Function));
                expect(err).toBeNull();
                done();
            });
    });
});

describe("PostgresConnection close() disconnects from Postgres DB", () => {
    const credentials = {
        host: "127.0.0.1",
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: "",
    };
    let conn: PostgresConnection;
    let mockClient: Client;
    beforeEach((done) => {
        mockClient = new Client(credentials);
        spyOn(mockClient, "end").and.callThrough();
        PostgresConnection.createConnection(
            mockClient,
            "MRI",
            (err, connection) => {
                conn = connection;
                done();
        });
    });
    it("closes connection when close is called", () => {
        conn.close();
        expect(mockClient.end).toHaveBeenCalledWith();
    });
});

describe("PostgresConnection setCurrentUserToDbSession() sets APPLICATIONUSER value in session", () => {
    const credentials = {
        host: "127.0.0.1",
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: "",
        idle_in_transaction_session_timeout: 5,
    };
    let conn: PostgresConnection;
    let mockClient: Client;
    beforeEach((done) => {
        mockClient = new Client(credentials);
        spyOn(mockClient, "query").and.callThrough();
        PostgresConnection.createConnection(
            mockClient,
            "MRI",
            (err, connection) => {
                conn = connection;
                done();
        });
    });
    it("sets APPLICATIONUSER value in session when setCurrentUserToDbSession is called", (done) => {
        conn.setCurrentUserToDbSession("appUser", (err, connection) => {
            expect(mockClient.query).toHaveBeenCalledWith("SET APPLICATIONUSER = 'appUser';",
                [], jasmine.any(Function));
            done();
        });
    });
});
