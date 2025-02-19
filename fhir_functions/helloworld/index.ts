import express from 'npm:express';

const app = express();

app.get('/api/fhir/helloworld', (req, res) => {
	res.send('Welcome to the Dinosaur FHIR API!');
});

app.listen(8000);
