import express, {Application} from 'npm:express'
import { FhirRouter } from "./src/fhir-svc/routes.ts"

export class App {
    private app: Application
    private readonly logger = console

    constructor() {
        this.app = express()
    }

    async start() {
        this.app.use(express.json())
        this.app.use('/gateway/api/fhir', new FhirRouter().router);
        this.app.listen(8000)
        this.logger.info(`🚀 ALP FHIR Service started successfully!`)
    }
}
let app = new App()
app.start()