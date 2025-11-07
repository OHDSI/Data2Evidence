export type IFRFilter = {
    configMetadata: {
        id: string;
        version: string;
    };
    cards: {
        content: (IFRFilterCard | IFRExcludedFilterCard)[];
        type: string;
        op: string;
    };
    sort: string;
};

export type IFRExcludedFilterCard = {
    content: IFRFilterCard[];
    type: string;
    op: string;
};

export type IFRFilterCard = {
    content: IFRFilterCardContent[];
    type: string;
    op: string;
};

export type IFRFilterCardContent = {
    configPath: string;
    instanceNumber: number;
    instanceID: string;
    name: string;
    inactive: boolean;
    type: string;
    attributes: IFRContentAttributes;
    advanceTimeFilter: any | null;
};

export type IFRContentAttributes = {
    content: {
        configPath: string;
        instanceID: string;
        type: string;
        constraints: {
            content: (IFRContentForSimpleFilter | IFRContentForComplexFilter)[];
            type: string;
            op: string;
        };
    }[];
    type: string;
    op: string;
};

export type IFRContentForSimpleFilter = {
    type: string;
    operator: string;
    value: string | number;
};

export type IFRContentForComplexFilter = {
    type: string;
    op: string;
    content: {
        type: string;
        operator: string;
        value: string;
    }[];
};

export type IFRDefinition = {
    filter: IFRFilter;
};

// *******
// Types that are part of bookmark, but not for actual filtering
// *******

export type IFRAxisSelection =
    | {
          attributeId: string;
          binsize: string;
          categoryId: string;
      }
    | {
          attributeId: string;
          categoryId: string;
          binsize?: string;
      };

export type IFRMetadata = {
    version: number;
};
