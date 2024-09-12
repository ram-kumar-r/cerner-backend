const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = '98bbc328-e7a6-4044-ba56-70c3b241631e';
// const REDIRECT_URI = 'http://localhost:5173/patientlist';  // Ensure this matches what's registered in Cerner
const REDIRECT_URI = 'http://ehr-ens.s3-website-us-east-1.amazonaws.com/patientlist';  // Ensure this matches what's registered in Cerner

app.get('/launch', (req, res) => {
    const fhirServerUrl = req.query.iss;
    const launchToken = req.query.launch;
    const scopes = 'patient/Person.write patient/Patient.read patient/Patient.write patient/Person.read patient/Account.read patient/Account.write patient/Appointment.write patient/Appointment.read patient/Practitioner.write patient/Practitioner.read patient/Location.write patient/Location.read patient/AllergyIntolerance.write patient/AllergyIntolerance.read patient/CarePlan.read patient/Condition.read patient/Condition.write patient/Immunization.read patient/Immunization.write patient/DocumentReference.read patient/DocumentReference.write patient/Binary.read patient/Observation.read patient/MedicationRequest.read patient launch';
    const aud = 'https://fhir-ehr-code.cerner.com/dstu2/ec2458f2-1e24-41c8-b71b-0e701af7583d/'
    if (!fhirServerUrl || !launchToken) {
        return res.status(400).send('Missing required parameters: iss or launch');
    }

    const authorizeUrl = `https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/personas/provider/authorize`;
    const redirectUrl = `${authorizeUrl}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&launch=${launchToken}&aud=${aud}&scope=${encodeURIComponent(scopes)}&state=123`;
    console.log('redirectUrl', redirectUrl);
    res.redirect(redirectUrl);
});

app.get('/patientlist', async (req, res) => {
    const { code } = req.query;
    console.log('code', code);

    if (!code) {
        return res.status(400).send('Authorization code missing');
    }

    const tokenUrl = `https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/token`;

    try {
        const response = await axios.post(tokenUrl, new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        console.log('response', response.data.access_token);
        const accessToken = response.data.access_token;

        const patientUrl = `https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/Patient`; // Adjust with correct FHIR base URL
        const patientResponse = await axios.get(patientUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        res.send(patientResponse.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).send('Error processing request');
    }
});

app.listen(3006, () => {
    console.log('SMART app listening on port 3006');
});
