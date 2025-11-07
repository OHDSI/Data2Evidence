import { Injectable, SCOPE } from "@danet/core";
import { Brackets } from "npm:typeorm";
import { TenantService } from "../../tenant/tenant.service.ts";
import { IDatasetResponseDto, IDatasetSearchFilterDto } from "../../types.d.ts";
import { DatasetRepository } from "../repository/dataset.repository.ts";

const SWAP_TO = {
  STUDY: ["dataset", "study"],
  DATASET: ["study", "dataset"],
};

@Injectable({ scope: SCOPE.REQUEST })
export class PublicDatasetQueryService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly datasetRepo: DatasetRepository
  ) {}

  async getDatasets(queryParams: IDatasetSearchFilterDto) {
    const { searchText } = queryParams;

    const query = this.datasetRepo
      .createQueryBuilder("dataset")
      .leftJoin("dataset.datasetDetail", "datasetDetail")
      .leftJoin("dataset.tags", "tag")
      .leftJoin("dataset.attributes", "attribute")
      .leftJoin("attribute.attributeConfig", "attributeConfig")
      .where("dataset.visibilityStatus = :visibilityStatus", {
        visibilityStatus: "PUBLIC",
      })
      .select([
        "dataset.id",
        "dataset.tokenDatasetCode",
        "dataset.databaseCode",
        "dataset.schemaName",
        "dataset.dataModel",
        "datasetDetail.id",
        "datasetDetail.name",
        "datasetDetail.description",
        "datasetDetail.summary",
        "datasetDetail.showRequestAccess",
        "tag.id",
        "tag.name",
        "attribute.attributeId",
        "attribute.value",
        "attributeConfig.name",
        "attributeConfig.dataType",
        "attributeConfig.isDisplayed",
      ]);

    if (searchText) {
      const tsQuery = this.convertToTsqueryFormat(
        this.sanitizeTsQueryInput(searchText)
      );
      if (tsQuery) {
        query
          .setParameter("searchText", tsQuery)
          .andWhere(
            new Brackets((qb) => {
              qb.where(
                '"datasetDetail"."search_tsv" @@ to_tsquery(\'english\', :searchText)'
              ).orWhere(
                '"attribute"."search_tsv" @@ to_tsquery(\'english\', :searchText)'
              );
            })
          )
          .orderBy(
            'ts_rank("datasetDetail"."search_tsv", to_tsquery(\'english\', :searchText))',
            "DESC"
          );
      }
    }

    const datasets = await query.getMany();

    const tenant = this.tenantService.getTenant();

    const datasetDtos = await datasets.reduce<Promise<IDatasetResponseDto[]>>(
      async (accP, dataset) => {
        const acc = await accP;

        const { dataModel, ...restDataset } = dataset;
        const formattedDataModel = dataModel.replace(/\s*\[.*?\]/, "").trim();
        const datasetDto: IDatasetResponseDto = {
          dataModel: formattedDataModel,
          ...restDataset,
          tenant,
        };

        const { ...rest } = datasetDto;
        acc.push(rest);
        return acc;
      },
      Promise.resolve([])
    );

    return datasetDtos.map((datasetDto) =>
      this.swapVariables(datasetDto, SWAP_TO.STUDY)
    );
  }

  private swapVariables<T>(object, swapPair: string[]) {
    const from = swapPair[0];
    const to = swapPair[1];
    const fromCapitalised = from.charAt(0).toUpperCase() + from.slice(1);
    for (const key in object) {
      if (key.includes(from)) {
        const newKey = key.replace(from, to);
        object[newKey] = object[key];
        delete object[key];
      } else if (key.includes(fromCapitalised)) {
        const toCapitalised = to.charAt(0).toUpperCase() + to.slice(1);
        const newKey = key.replace(fromCapitalised, toCapitalised);
        object[newKey] = object[key];
        delete object[key];
      }
    }
    return <T>object;
  }

  private sanitizeTsQueryInput(input: string) {
    return input.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  }

  private convertToTsqueryFormat(input: string) {
    const normalizedInput = input.replace(/\s+/g, " ");
    const terms = normalizedInput.split(" ").filter((term) => term.length > 0);
    return terms.join(" | ");
  }
}
