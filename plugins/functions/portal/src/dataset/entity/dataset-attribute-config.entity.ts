import { Column, Entity, PrimaryColumn } from "npm:typeorm";
import { Audit } from "../../common/entity/audit.entity.ts";

@Entity("dataset_attribute_config")
export class DatasetAttributeConfig extends Audit {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ name: "data_type" })
  dataType: string;

  @Column({ name: "category" })
  category: string;

  @Column({ name: "is_displayed" })
  isDisplayed: boolean;
}
