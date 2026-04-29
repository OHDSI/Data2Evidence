import { ParserContainer } from "./ParserContainer";
import { Source } from "./Source";
import * as Keys from "../keys";
import { FastUtil } from "../fast_util";
import { Aggregate } from "./Aggregate";

export class AggregateFactory {
    static createAggregate(type: string, request: ParserContainer, sourceName: string, action: string): Aggregate {
        FastUtil.replace(request, "path", "pathId", undefined);
        FastUtil.replace(request, "alias", undefined, sourceName);

        let agg = new Aggregate(request, action, type, new Source(sourceName, Keys.CQLTERM_EXPRESSIONREF));
        FastUtil.addTemplateId(agg);

        return agg;
    }
}
