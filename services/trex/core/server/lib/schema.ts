export const dbSchema = {
    "id": "/dbSchema",
    "type": "object",
    "properties": {
      "code": {"type": "string"},
      "host": {"type": "string"},
      "port": {"type": "number"},
      "name": {"type": "string"},
      "dialect": {"type": "string"},
  
      "credentials": {
        "type": "array",
        "items": {
          "type": "object",   
          "properties": {
              "username": {"type": "string"},
              "password": {"type": "string"},
              "salt": {"type": "string"},
              "userScope": {"type": "string"},
              "serviceScope": {"type": "string"},
              },  
          "required": ["username","password","userScope","serviceScope"],
        },
      },
      "vocabSchemas": {
          "type": "array",
          "items": {"type": "string"},
      },
      "publications": {
          "type": "array",
          "items": {
              "type": "object",   
              "properties": {
                  "publication": {"type": "string"},
                  "slot": {"type": "string"},
                  },  
              "required": ["publication","slot"],
          },
      },
      
  
      "extra": {"type": "object"},
    },
    "required": ["code", "host", "port", "name", "dialect", "credentials"]
  };

  export const dbSchemaUpdate = dbSchema;
  dbSchemaUpdate.required = ["code", "host", "port", "name", "dialect"];

  