import pg from "pg";
import { env, services } from './env.ts'

const queryPostgres = async (
    client: pg.Client,
    query: string,
    values: Array<string | number>
  ) => {
    return await client.query(query, values);
  };
  
export const seed = async () => {
  const FHIR_CLIENT_ID = env.FHIR__CLIENT_ID
  const FHIR_CLIENT_SECRET = env.FHIR__CLIENT_SECRET;

  if (!FHIR_CLIENT_ID || !FHIR_CLIENT_SECRET) {
    throw new Error("No client credentials are set for Fhir");
  }

  let client = new pg.Client({
    user: env.PG_SUPER_USER,
    password: env.PG_SUPER_PASSWORD,
    host: env.PG__HOST,
    port: parseInt(env.PG__PORT),
    database: env.PG__DB_NAME,
  });

  await client.connect();

  console.log("Retrieving existing Super Admin project and Practitioner ids");

  const projectIdResult = await queryPostgres(
    client,
    `SELECT "projectId", "content" FROM public."Project" WHERE name = 'Super Admin'`,
    []
  );

  const projectId: string = projectIdResult.rows[0].projectId;
  const projectContent: string = projectIdResult.rows[0].content;

  const practitionerResult = await queryPostgres(
    client,
    `SELECT id FROM public."Practitioner" WHERE "projectId" = $1`,
    [projectId]
  );

  const practitioner: string = practitionerResult.rows[0].id;

  console.log("Seeding tables");


  console.log("Enable bots for Super Admin")
  
  let jsonParsedProjectContent = JSON.parse(projectContent)
  jsonParsedProjectContent.features = ['bots']
  jsonParsedProjectContent.meta.versionId = '2c8b0331-863a-432e-a5d1-ef0619acc3d2'
  jsonParsedProjectContent.secret = [
    {
      "name": "client_id",
      "valueString": env.IDP__ALP_DATA_CLIENT_ID
    },
    {
      "name": "client_secret",
      "valueString": env.IDP__ALP_DATA__CLIENT_SECRET
    },
    {
      "name": "alp_auth_route",
      "valueString": env.ALP_GATEWAY_OAUTH__URL
    },
    {
      "name": "fhir_svc_route",
      "valueString": services.fhirSvc
    }
  ]

  await queryPostgres(
    client,
    `INSERT INTO public."Project_History" ("versionId", id, "content", "lastUpdated")
    values('2c8b0331-863a-432e-a5d1-ef0619acc3d2', $1, $2, $3) ON CONFLICT("versionId") \
    DO NOTHING;` ,
    [
      projectId,
      jsonParsedProjectContent,
      "2024-06-13 14:40:48.738 +0800"
    ]
  );
  
  await queryPostgres(
    client,
    `UPDATE public."Project" SET "content" = $1 WHERE name = 'Super Admin'` ,
    [
      jsonParsedProjectContent
    ]
  );

  const ClientApplicationContent = `{"meta":{"project":"${projectId}","versionId":"7ef81144-11f4-40ef-a017-da8885a0d36e","lastUpdated":"2024-06-13T06:40:48.738Z","author":{"reference":"Practitioner/${practitioner}","display":"Medplum Admin"},"compartment":[{"reference":"Project/${projectId}"}]},"resourceType":"ClientApplication","name":"d2eClient","secret":"${FHIR_CLIENT_SECRET}","description":"d2eClient","id":"${FHIR_CLIENT_ID}"}`;
  const ProjectMembershipContent = `{"meta":{"project":"${projectId}","versionId":"6e4864a8-b1df-417c-8aa9-35a4cb660e07","lastUpdated":"2024-06-13T06:40:48.762Z","author":{"reference":"system"},"compartment":[{"reference":"Project/${projectId}"}]},"resourceType":"ProjectMembership","project":{"reference":"Project/${projectId}"},"user":{"reference":"ClientApplication/${FHIR_CLIENT_ID}","display":"d2eClient"},"profile":{"reference":"ClientApplication/${FHIR_CLIENT_ID}","display":"d2eClient"},"id":"c5e1a35d-c979-428f-81db-9e3502c3ffa3"}`;

  await queryPostgres(
    client,
    `INSERT INTO public."ClientApplication" (id, content, "lastUpdated", compartments, name, "projectId") \
    VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT(id) \
    DO NOTHING;`,
    [
      `${FHIR_CLIENT_ID}`,
      ClientApplicationContent,
      "2024-06-13 14:40:48.738 +0800",
      `{${projectId}}`,
      "d2eClient",
      projectId,
    ]
  );

  console.log("Seeding Client Application table complete");

  await queryPostgres(
    client,
    `INSERT INTO public."ClientApplication_History" ("versionId", id, content, "lastUpdated") \
    VALUES ($1, $2, $3, $4) ON CONFLICT("versionId") \
    DO NOTHING;`,
    [
      "7ef81144-11f4-40ef-a017-da8885a0d36e",
      `${FHIR_CLIENT_ID}`,
      ClientApplicationContent,
      "2024-06-13 14:40:48.738 +0800",
    ]
  );

  console.log("Seeding Client Application History table complete");

  await queryPostgres(
    client,
    `INSERT INTO public."ProjectMembership" (id, content, "lastUpdated", compartments, project, "user", profile, "profileType", "projectId") \
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT(id) \
    DO NOTHING;
    `,
    [
      "c5e1a35d-c979-428f-81db-9e3502c3ffa3",
      ProjectMembershipContent,
      "2024-06-13 14:40:48.762 +0800",
      `{${projectId}}`,
      `Project/${projectId}`,
      `ClientApplication/${FHIR_CLIENT_ID}`,
      `ClientApplication/${FHIR_CLIENT_ID}`,
      "ClientApplication",
      projectId,
    ]
  );

  console.log("Seeding Project Membership table complete");

  await queryPostgres(
    client,
    `INSERT INTO public."ProjectMembership_History" ("versionId", id, content,"lastUpdated") \ 
    VALUES ($1, $2, $3, $4) ON CONFLICT("versionId") \
    DO NOTHING;`,
    [
      "6e4864a8-b1df-417c-8aa9-35a4cb660e06",
      "c5e1a35d-c979-428f-81db-9e3502c3ffa3",
      ProjectMembershipContent,
      "2024-06-13 14:40:48.762 +0800",
    ]
  );

  console.log("Seeding Project Membership History table complete");

  client.end();
};

seed()
