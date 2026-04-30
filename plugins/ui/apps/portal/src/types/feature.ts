export interface IFeature {
  feature: string;
  name?: string;
  nameI18nKey?: string;
  isEnabled: boolean;
}

export interface FeatureInput {
  feature: string;
  isEnabled: boolean;
}
