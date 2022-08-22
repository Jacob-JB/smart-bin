const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

app.use('/', express.static(__dirname + '/static/'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/index.html');
});

const port = 80

server.listen(port, () => {
    console.log(`listening on port \x1b[34m${port}\x1b[0m`)
});