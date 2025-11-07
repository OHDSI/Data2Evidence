import { FastUtil } from "./fast_util";
import { Statement } from "./def/Statement";
import { RequestFactory, Request } from "./req/RequestFactory";
import { RequestProcessing } from "./req/RequestProcessing";
import { requestValidation } from "./req/RequestValidation";

export class Fast {
    public statement: any;
    public select: any;
    public message: any = {};
    private request: any;
    private req: Request;

    constructor(public action: string, request: any, config: any, pHolderTable: any, censoringThreshold?: string) {

        this.statement = {};
        this.select = {};
        this.request = this.filterInactive(request);
        this.req = RequestFactory.createRequest(action, this.request, config, pHolderTable); // form parsedrequest from UI request
        this.req.censoringThreshold = censoringThreshold;

        this.req.parse(); //form parser container based on parsed request

        RequestProcessing.requestProcessing(action, this.req, this.message);
        requestValidation(action, this.req.parserContainers, this.req.getConfig(), this.message);
        this.build();
        this.select = RequestProcessing.getFERenderingData(action, this.req);

    }

    private filterInactive(request) {
        if (request && request.cards && request.cards.content) {
            for (let i = 0; i < request.cards.content.length; i += 1) {
                const filterCardGroup = request.cards.content[i];
                if (filterCardGroup.content) {
                    const filteredContent = [];
                    filterCardGroup.content.forEach((filterCard) => {
                        if (!(filterCard.content && filterCard.content[0]
                            && filterCard.content[0]._inactive)
                            && !(filterCard._inactive)) {
                            filteredContent.push(filterCard);
                        }
                    });
                    filterCardGroup.content = filteredContent;
                }
            }
        }
        return request;
    }

    private build() {
        let stmt = new Statement(this.req.parserContainers, this.action);
        this.statement = stmt.print();
        FastUtil.trim(this.statement);
    }
}
