import express from "express";
import * as fs from "node:fs";
import * as path from "node:path";

// Declare Trex as a global
declare const Trex: any;

export class HelloWorldController {
  public router = express.Router();

  constructor() {
    this.router.get("/", this.getHelloWorld.bind(this));
    this.router.get("/list-files", this.listFiles.bind(this));
    this.router.get("/atlas-query", this.executeAtlasQuery.bind(this));
  }

  private async getHelloWorld(req: express.Request, res: express.Response) {
    try {
      res.json({
        message: "Hello World!",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async listFiles(req: express.Request, res: express.Response) {
    try {
      const currentDir = path.dirname('/var/tmp/sb-compile-trex');
      const parentDir = path.dirname(currentDir);
      
      // List files in the hello-world directory
      const files = fs.readdirSync(parentDir);
      const fileDetails = files.map(file => {
        const filePath = path.join(parentDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        };
      });

      // Also check controllers directory
      const controllersDir = path.join(parentDir, 'controllers');
      let controllerFiles: any[] = [];
      if (fs.existsSync(controllersDir)) {
        const controllers = fs.readdirSync(controllersDir);
        controllerFiles = controllers.map(file => {
          const filePath = path.join(controllersDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: `controllers/${file}`,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime
          };
        });
      }

      res.json({
        message: "Directory listing",
        currentDir: parentDir,
        files: fileDetails,
        controllerFiles: controllerFiles,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error listing files:", error);
      res.status(500).json({ 
        error: "Failed to list files",
        details: error?.message || String(error)
      });
    }
  }

  private async executeAtlasQuery(req: express.Request, res: express.Response) {
    try {
      // Sample OHDSI ATLAS cohort definition
      const sampleAtlasCohort = {
        "ConceptSets": [],
        "PrimaryCriteria": {
          "CriteriaList": [
            {
              "ConditionOccurrence": {
                "CodesetId": 0,
                "ConditionTypeExclude": false
              }
            }
          ],
          "ObservationWindow": {
            "PriorDays": 0,
            "PostDays": 0
          },
          "PrimaryCriteriaLimit": {
            "Type": "First"
          }
        },
        "QualifiedLimit": {
          "Type": "First"
        },
        "ExpressionLimit": {
          "Type": "First"
        },
        "InclusionRules": [],
        "EndStrategy": {
          "DateOffset": {
            "DateField": "EndDate",
            "Offset": 0
          }
        },
        "CensoringCriteria": [],
        "CollapseSettings": {
          "CollapseType": "ERA",
          "EraPad": 0
        },
        "CensorWindow": {}
      };

      // Hardcoded parameters
      const cdmSchema = "demo_cdm";
      const cohortId = Math.floor(Math.random() * 1000000);
      const atlasCohort = sampleAtlasCohort;

      // Get database credentials
      const dbm = Trex.databaseManager();
      const databaseCredentials = dbm.getDatabaseCredentials();
      
      if (!databaseCredentials || databaseCredentials.length === 0) {
        return res.status(400).json({ 
          error: "No database credentials available" 
        });
      }

      // Extract the first database connection details
      const dbConfig = databaseCredentials[0];
      const connectionDetails = {
        code: dbConfig.code,
        id: dbConfig.id,
        host: dbConfig.host,
        port: dbConfig.port,
        name: dbConfig.name,
        dialect: dbConfig.dialect,
        vocabSchemas: dbConfig.vocab_schemas,
        authenticationMode: dbConfig.authentication_mode,
      };

      // Get the database connection
      const dbc = dbm.getConnection(
        dbConfig.code,
        cdmSchema,
        cdmSchema, // vocabSchema
        cdmSchema, // resultSchema
        {}
      );

      // Execute atlas with callback (4th argument)
      const result = await new Promise((resolve, reject) => {
        dbc.atlas(atlasCohort, cdmSchema, cohortId, (err: any, data: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });

      res.json({
        message: "Atlas query executed successfully",
        cohortId: cohortId,
        cdmSchema: cdmSchema,
        connectionDetails: connectionDetails,
        result: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error executing atlas query:", error);
      res.status(500).json({ 
        error: "Failed to execute atlas query",
        details: error?.message || String(error)
      });
    }
  }
}
