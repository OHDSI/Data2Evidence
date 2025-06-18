from pydantic import BaseModel

class FHIRToOMOPOptionsType(BaseModel):
    batchChunksize: str
    fhirGatewayJdbcCurl: str
    fhirGatewayUsername: str
    fhirGatewayPassword:str
    fhirGatewayTable: str
    omopCDMJdbcCurl: str
    omopCDMUsername: str
    omopCDMPassword: str
    omopCDMSchema: str
    dataBeginDate: str
    dataEndDate: str