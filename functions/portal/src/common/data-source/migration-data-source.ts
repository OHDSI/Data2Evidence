import { DataSource, DataSourceOptions } from "npm:typeorm";
import { Config } from "../../config/entity/config.entity.ts";
import { DatasetAttributeConfig } from "../../dataset/entity/dataset-attribute-config.entity.ts";
import { DatasetAttribute } from "../../dataset/entity/dataset-attribute.entity.ts";
import { DatasetDashboard } from "../../dataset/entity/dataset-dashboard.entity.ts";
import { DatasetDetail } from "../../dataset/entity/dataset-detail.entity.ts";
import { DatasetRelease } from "../../dataset/entity/dataset-release.entity.ts";
import { DatasetTagConfig } from "../../dataset/entity/dataset-tag-config.entity.ts";
import { DatasetTag } from "../../dataset/entity/dataset-tag.entity.ts";
import { Dataset } from "../../dataset/entity/dataset.entity.ts";
import { Feature } from "../../feature/entity/feature.entity.ts";
import { Notebook } from "../../notebook/entity/notebook.entity.ts";
import { UserArtifactGroup } from "../../user-artifact/entity/user-artifact-group.entity.ts";
import { UserArtifact } from "../../user-artifact/entity/user-artifact.entity.ts";
import { createDatasetTables1676872851977 } from "./migrations/1676872851977-create-dataset-tables.ts";
import { updateDataset1677809439828 } from "./migrations/1677809439828-update-dataset.ts";
import { updateDatasetDetail1677825145320 } from "./migrations/1677825145320-update-dataset-detail.ts";
import { updateDataset1678343392349 } from "./migrations/1678343392349-update-dataset.ts";
import { updateDataset1678762314955 } from "./migrations/1678762314955-update-dataset.ts";
import { UpdateDataset1682576221273 } from "./migrations/1682576221273-update-dataset.ts";
import { CreateMetadata1685082669454 } from "./migrations/1685082669454-create-metadata.ts";
import { CreateTag1685342973667 } from "./migrations/1685342973667-create-tag.ts";
import { CreateRelease1685342973670 } from "./migrations/1685342973670-create-dataset-release.ts";
import { UpdateDataset1691386594669 } from "./migrations/1691386594669-update-dataset.ts";
import { UpdateDataset1691644642674 } from "./migrations/1691644642674-update-dataset.ts";
import { CreateDatasetNotebook1698308495407 } from "./migrations/1698308495407-create-dataset-notebook.ts";
import { CreateMetadataConfigTables1700541858141 } from "./migrations/1700541858141-create-metadata-config-tables.ts";
import { CreateFeature1700544324752 } from "./migrations/1700544324752-create-feature.ts";
import { UpdateDatasetMetadata1700551597884 } from "./migrations/1700551597884-update-dataset-metadata.ts";
import { RenameMetadataToAttribute1700648789750 } from "./migrations/1700648789750-rename-metadata-to-attribute.ts";
import { UpdateMetadataConfigRelationship1701165537531 } from "./migrations/1701165537531-update-metadata-config-relationship.ts";
import { AddDatasetAttributeUniqueConstraint1701234230874 } from "./migrations/1701234230874-add-dataset-attribute-unique-constraint.ts";
import { DropDatasetNotebook1701393727124 } from "./migrations/1701393727124-drop-dataset-notebook.ts";
import { CreateNotebookTable1701394052067 } from "./migrations/1701394052067-create-notebook-table.ts";
import { AddIsSharedToNotebook1701441915734 } from "./migrations/1701441915734-add-is-shared-to-notebook.ts";
import { CreateDashboardTable1704260273863 } from "./migrations/1704260273863-create-dashboard-table.ts";
import { UpdateDashboard1705398488032 } from "./migrations/1705398488032-update-dashboard.ts";
import { UpdateDataset1706502348548 } from "./migrations/1706502348548-update-dataset.ts";
import { AddBasePathToDashboard1706769968727 } from "./migrations/1706769968727-add-base-path-to-dashboard.ts";
import { UpdateNotebookUserIdType1709882267428 } from "./migrations/1709882267428-update-notebook-user-id-type.ts";
import { UpdateDatasetAddTsvector1715738854019 } from "./migrations/1715738854019-update-dataset-add-tsvector.ts";
import { CreateConfigTable1718982722183 } from "./migrations/1718982722183-create-config-table.ts";
import { UpdateDatasetDashboardNameUnique1719500584671 } from "./migrations/1719500584671-update-dataset-dashboard-name-unique.ts";
import { UpdateDatasetAddFhirProjectId17211757718560 } from "./migrations/17211757718560-update-dataset-add-fhir-project-id.ts";
import { UpdateDatasetAddPlugin17211757718561 } from "./migrations/17211757718561-update-dataset-add-plugin.ts";
import { UpdateDatasetSplitDatamodelColumn17211757718562 } from "./migrations/17211757718562-update-dataset-split-datamodel-column.ts";
import { CreateUserArtifactTable1729863090719 } from "./migrations/1729863090719-create-user-artifact-table.ts";
import { CreateUserArtifactGroupTable1730946830529 } from "./migrations/1730946830529-create-user-artifact-group-table.ts";
import { CreateUserArtifactSequence1739779063184 } from "./migrations/1739779063184-create-user-artifact-sequence.ts";

const _env = Deno.env.toObject();

const migrationDataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: _env.PG_HOST,
  port: parseInt(_env.PG_PORT),
  username: _env.PG_MANAGE_USER,
  password: _env.PG_MANAGE_PASSWORD,
  database: _env.PG_DATABASE,
  schema: _env.PG_SCHEMA,
  ssl: (() => {
    let ssl: any = JSON.parse(_env.PG__SSL.toLowerCase());
    if (_env.PG__CA_ROOT_CERT) {
      ssl = {
        rejectUnauthorized: true,
        ca: _env.PG__CA_ROOT_CERT,
      };
    }
    return ssl;
    })(),
  poolSize: parseInt(_env.PG__MAX_POOL) || 10,
  entities: [
    Config,
    DatasetAttributeConfig,
    DatasetAttribute,
    DatasetDashboard,
    DatasetDetail,
    DatasetRelease,
    DatasetTagConfig,
    DatasetTag,
    Dataset,
    Feature,
    Notebook,
    UserArtifactGroup,
    UserArtifact,
  ],
  migrations: [
    createDatasetTables1676872851977,
    updateDataset1677809439828,
    updateDatasetDetail1677825145320,
    updateDataset1678343392349,
    updateDataset1678762314955,
    UpdateDataset1682576221273,
    CreateMetadata1685082669454,
    CreateTag1685342973667,
    CreateRelease1685342973670,
    UpdateDataset1691386594669,
    UpdateDataset1691644642674,
    CreateDatasetNotebook1698308495407,
    CreateMetadataConfigTables1700541858141,
    CreateFeature1700544324752,
    UpdateDatasetMetadata1700551597884,
    RenameMetadataToAttribute1700648789750,
    UpdateMetadataConfigRelationship1701165537531,
    AddDatasetAttributeUniqueConstraint1701234230874,
    DropDatasetNotebook1701393727124,
    CreateNotebookTable1701394052067,
    AddIsSharedToNotebook1701441915734,
    CreateDashboardTable1704260273863,
    UpdateDashboard1705398488032,
    UpdateDataset1706502348548,
    AddBasePathToDashboard1706769968727,
    UpdateNotebookUserIdType1709882267428,
    UpdateDatasetAddTsvector1715738854019,
    CreateConfigTable1718982722183,
    UpdateDatasetDashboardNameUnique1719500584671,
    CreateUserArtifactTable1729863090719,
    CreateUserArtifactGroupTable1730946830529,
    UpdateDatasetAddFhirProjectId17211757718560,
    UpdateDatasetAddPlugin17211757718561,
    UpdateDatasetSplitDatamodelColumn17211757718562,
    CreateUserArtifactSequence1739779063184,
  ],
};
const migrationDataSource = new DataSource(migrationDataSourceOptions);
export default migrationDataSource;
