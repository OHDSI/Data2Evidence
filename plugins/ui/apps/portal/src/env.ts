import _ from "lodash";

// @ts-ignore
const env = _.merge(window.ENV_DATA || {}, process.env || {});

export default env;
