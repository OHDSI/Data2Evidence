import express from 'npm:express';

const app = express();
app.use(express.text());


app.post('/d2e/api/chat', async (req, res: any) => {
    res.setHeader('Content-Type', 'text/plain');
    
	const query = req.body || "say hello";
	console.log(req.body)

    const stream = await Trex.ask(query);
    const reader = stream.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        res.write(value);
		if (typeof res.flush === 'function') {
            res.flush();
        }
    }
    res.end();
});

app.listen(8000);
