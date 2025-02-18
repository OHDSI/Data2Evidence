export const REQUIRED_URL_SCOPES = [
  // PA & PA Config UI
  {
    path: "^/analytics-svc/(.*)/ui/(.*)",
    scopes: ["PA.ui"],
  },
  {
    path: "^/analytics-svc/(.*)/i18n/(.*)",
    scopes: ["PA.ui"],
  },

  // PA
  {
    path: "^/analytics-svc/plugins/(.*)",
    scopes: ["PA.svc"],
  },
  {
    path: "^/analytics-svc/api/services/(fhir|data)/schema(.*)",
    scopes: ["PAConfig.svc"],
  },
  {
    path: "^/analytics-svc/api/services/(fhir|data)/(?!schema)(.*)",
    scopes: ["PA.svc"],
  },
  {
    path: "^/analytics-svc/api/services/(?!fhir|data)(.*)",
    scopes: ["PA.svc"],
  },
  {
    path: "^/analytics-svc/pa/services(.*)",
    scopes: ["PA.svc"],
  },
  {
    path: "^/pa-config-svc/enduser(.*)",
    scopes: ["PAConfig.svc/read"],
  },

  // PA Config
  {
    path: "^/pa-config-svc/(.*)",
    scopes: ["PAConfig.svc"],
  },

  // PS Config
  {
    path: "^/ps-config-svc/(.*)",
    scopes: ["PSConfig.svc"],
  },

  // CDW
  {
    path: "^/hc/hph/cdw/config/ui/(.*)",
    scopes: ["CDWConfig.ui"],
  },
  {
    path: "^/hc/hph/config/(global/ui|i18n)/(.*)",
    scopes: ["CDWConfig.ui"],
  },
  {
    path: "^/hc/hph/cdw/config/services/config.xsjs(.*)",
    scopes: ["CDWConfig.svc/read", "CDWConfig.svc"],
    httpMethods: ["GET", "POST"],
  },
  {
    path: "^/hc/hph/cdw/config/services/config.xsjs(.*)",
    scopes: ["CDWConfig.svc"],
  },
  {
    path: "^/hc/hph/cdw/(.*)$",
    scopes: ["CDWConfig.svc"],
  },
  {
    path: "^/hc/hph/config/services/(global|config).xsjs(.*)",
    scopes: ["CDWConfig.svc"],
  },

  // ASSIGNMENT
  {
    path: "^/hc/hph/config/assignment/ui/(.*)",
    scopes: ["ConfigAssignment.ui"],
  },
  {
    path: "^/hc/hph/config/assignment/(.*)",
    scopes: ["ConfigAssignment.svc"],
  },
  {
    path: "^/hc/hph/config/services/assignment.xsjs(.*)",
    scopes: ["ConfigAssignment.svc"],
  },
];
