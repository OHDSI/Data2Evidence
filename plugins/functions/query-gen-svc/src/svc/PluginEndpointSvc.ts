import { PholderTableMapType, Settings } from "../qe/settings/Settings";

export class PluginEndpointSvc {
    private settingsObj: Settings;
    private pholderTableMap: PholderTableMapType;

    constructor(private config: any, private querySelector: string) {
        this.settingsObj = new Settings().initAdvancedSettings(
            this.config.advancedSettings
        );
        this.pholderTableMap = this.settingsObj.getGuardedPlaceholderMap();
    }

    public async generateQuery() {
        if (this.querySelector !== "factTablePlaceholder") {
            return;
        }
        const columnName = this.getColumn(
            this.settingsObj.getFactTablePlaceholder() + ".PATIENT_ID"
        );
        const queryString = `%Q AND "pTable".${columnName} = '%UNSAFE'`;
        return queryString;
    }

    private getColumn = (columnId: string): string => {
        const col = this.pholderTableMap[columnId];
        if (col) {
            return col;
        } else {
            throw new Error(`${columnId} is not defined in placeholderMap`);
        }
    };
}
