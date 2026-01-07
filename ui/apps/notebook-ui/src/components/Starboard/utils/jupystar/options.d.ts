export interface JupystarOptions {
    convertLatexBlocks: boolean;
}
export declare const DEFAULT_JUPYSTAR_OPTIONS: JupystarOptions;
export declare function getJupystarOptions(userOptions?: Partial<JupystarOptions>): JupystarOptions;
