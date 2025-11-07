import {With} from "./With";

export class JoinState {
    public conditionId = {};
    public previousInteractionIds = {};
    public parentInteractionId = {};

    constructor(public patientId: string) {
        this.patientId = patientId;
    }

    public getPreviousInteractionIds(interaction: With): string[] {
        let result = this.previousInteractionIds[interaction.getInteractionName()] || [];
        return result;
    }

    public getPatientId(): string {
        return this.patientId;
    }

    public getConditionId(conditionType: string): string {
        return this.conditionId[conditionType];
    }

    public addInteractionId(interaction: With): void {
        this.previousInteractionIds[interaction.getInteractionName()] = this.previousInteractionIds[interaction.getInteractionName()] || [];
        this.previousInteractionIds[interaction.getInteractionName()].push(interaction.getInteractionIdColumn(interaction.getBaseEntity()));
    }

    public setConditionId(interaction: With): void {
        if (interaction.getConditionName()) {
            this.conditionId[interaction.getConditionName()] = interaction.getConditionIdColumn(interaction.getBaseEntity());
        }
    }
}
