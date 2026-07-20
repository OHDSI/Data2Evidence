# Send requests to the fhir server

Using the access token that you got from [step 3](./3-get-auth-token.md) (replace bearer_token with the access token in the command), you may send a request to the endpoint - `https://$D2E__PUBLIC__FQDN/fhir-gateway/dataset/$dataset_token/$fhir_resource`.
The endpoint supports the following HTTP requests:

```
POST
GET
PUT
PATCH
DELETE
```

curl command example to post data to the fhir server.

```bash
curl -k \
  -X POST "https://$D2E__PUBLIC__FQDN/fhir-gateway/dataset/$dataset_token/$fhir_resource" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  --data "@first_donation"
```

Replace

- `D2E__PUBLIC__FQDN` with
  - localhost:41100 - local workstation
  - FQDN - remote server
- `dataset_token` with token dataset code created in [step 2](./2-create-dataset.md)
- `fhir_resource` with the FHIR resource type
  - If you are sending a bundle and would want the entries to be stored as a seperate resource in the fhir server, then leave this field blank.

first_donation will be a json string looking like the sample below.

```json
{
  "resourceType": "Procedure",
  "id": "example",
  "text": {
    "status": "generated",
    "div": "<div xmlns=\"http://www.w3.org/1999/xhtml\">Routine Appendectomy</div>"
  },
  "status": "completed",
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "80146002",
        "display": "Appendectomy (Procedure)"
      }
    ],
    "text": "Appendectomy"
  },
  "subject": {
    "reference": "Patient/1234"
  },
  "performedDateTime": "2013-04-05",
  "recorder": {
    "reference": "Practitioner/example",
    "display": "Dr Cecil Surgeon"
  },
  "asserter": {
    "reference": "Practitioner/example",
    "display": "Dr Cecil Surgeon"
  },
  "performer": [
    {
      "actor": {
        "reference": "Practitioner/example",
        "display": "Dr Cecil Surgeon"
      }
    }
  ],
  "reasonCode": [
    {
      "text": "Generalized abdominal pain 24 hours. Localized in RIF with rebound and guarding"
    }
  ],
  "followUp": [
    {
      "text": "ROS 5 days  - 2013-04-10"
    }
  ],
  "note": [
    {
      "text": "Routine Appendectomy. Appendix was inflamed and in retro-caecal position"
    }
  ]
}
```