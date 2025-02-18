export interface MedplumBotConfig {
    readonly name: string;
    readonly id: string;
    readonly description: string;
    readonly source: string;
    readonly dist?: string;
    readonly subscriptionCriteria?: string;
}