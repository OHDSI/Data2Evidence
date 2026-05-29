
#### In order to create an input for the running flows that depend on user token, use the following script
```
# POST request to create input user token
curl --location --request POST 'https://localhost:41100/jobplugins/prefect/flow-run/:flow-run-id/input-auth-token' \
--header 'Authorization: Bearer <AUTH_TOKEN>'

# DELETE request to delete input user token
curl --location --request DELETE 'https://localhost:41100/jobplugins/prefect/flow-run/:flow-run-id/input-auth-token' \
--header 'Authorization: Bearer <AUTH_TOKEN>'
```