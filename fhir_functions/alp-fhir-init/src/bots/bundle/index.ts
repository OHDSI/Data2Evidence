import axios from 'axios';
import https from 'https';

const getRequestConfig = async (token: any) => {
    let options = {};

    options = {
        headers: {
            Authorization: token
        },
        httpsAgent: new https.Agent({
            rejectUnauthorized: true,
            //ca: ca_crt
        })
};

return options;
}

const getClientCredentialsToken = async(clientId, clientSecret, authUrl) => {
    interface Map {
      [key: string]: string
    }

    const params: Map = {
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret
    };

    const options = {
        headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    };

    const data = Object.keys(params)
        .map(
        (key) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(
            params[key]
            )}`
        )
        .join("&");

    const result = await axios.post(authUrl, data, options);
    return result.data.access_token;
}

const insertIntoFhirDataModel = async (resourceType, inputData, secret_client_id, secret_client_secret, secret_fhir_route_auth, secret_fhir_svc_route) => {
    try {
        console.log('Entered insertIntoFhirDataModel');
        const token = await getClientCredentialsToken(secret_client_id, secret_client_secret, secret_fhir_route_auth);
        const options = await getRequestConfig(token);
        const baseUrl = secret_fhir_svc_route;
        if (baseUrl) {
            const url = `${baseUrl}/ingestResource/${resourceType}`;
            const result = await axios.post(url, inputData, options);
            console.log(result.data);
            return result.data;
        }
        else {
            throw new Error('No url is set for Fhir Service');
        }
    }
    catch (error) {
        console.log('Error while inserting into fhir datamodel');
        throw new Error('Error while inserting into fhir datamodel');
    }
}

export async function handler(medplum, event) {
    try {
        let bundle = event.input;

        let secret_client_id = event.secrets['client_id'].valueString;
        let secret_client_secret = event.secrets['client_secret'].valueString;
        let secret_fhir_route_auth = event.secrets['fhir_route_auth'].valueString;
        let secret_fhir_svc_route = event.secrets['fhir_svc_route'].valueString;

        console.log('Entered bundle bot handler');
        if (bundle.entry === undefined) {
            console.log('No entries in the bundle');
            return;
        }
        console.log('Create resource for each of the entry in the bundle');
        await insertIntoFhirDataModel('Bundle', bundle, secret_client_id, secret_client_secret, secret_fhir_route_auth, secret_fhir_svc_route);
    }
    catch (err) {
        console.log(err);
    }
}