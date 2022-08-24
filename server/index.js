const fs = require("fs")

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const http = require('http')
const server = http.createServer(app)

const io = new require('socket.io')(server)


const WebClients = []
class WebClient {
    constructor(socket) {
        this.socket = socket
        this.id = socket.id

        this.socket.on('disconnect', () => {
            WebClients.splice(WebClients.findIndex(e => {return e === this}), 1)
        })

        WebClients.push(this)

        //console.log('new sockect connection', this.id)

        this.socket.on('page loaded', () => {
            this.updateBins()
        })
    }

    updateBins() {
        this.socket.emit('update bins', bins.map(e => {return e.exportData()}))
    }
}
io.on('connection', socket => {new WebClient(socket)})


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use('/', express.static(__dirname + '/static/'))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/index.html')
})


const bins = []
class Bin {
    constructor(mac) {
        this.mac = mac

        bins.push(this)
    }

    update(postData, time) {
        if ((postData.Lat.length * postData.Lon.length) != 0) {
            let parsedLattitude = Number(postData.Lat.slice(0, postData.Lat.indexOf('.')-2))
            parsedLattitude += (postData.Lat.slice(postData.Lat.indexOf('.')-2, -1))/60
            parsedLattitude *= (postData.Lat.slice(-1) == 'N') ? 1 : -1

            let parsedLongitude = Number(postData.Lon.slice(0, postData.Lon.indexOf('.')-2))
            parsedLongitude += (postData.Lon.slice(postData.Lon.indexOf('.')-2, -1))/60
            parsedLongitude *= (postData.Lon.slice(-1) == 'E') ? 1 : -1

            this.lattitude = Math.round(parsedLattitude*(10**7))/(10**7)
            this.longitude = Math.round(parsedLongitude*(10**7))/(10**7)
        }

        this.depth = postData.Depth
        this.lastUpdated = getVisualTime()
        this.lastUpdateTimeRaw = time

        WebClients.forEach(e => {e.updateBins()})


        logLineToFile(`${this.lastUpdateTimeRaw}  ;${this.depth};${this.lattitude};${this.longitude}`, this.mac)
    }

    exportData() {
        return {
            "Mac address": this.mac,
            "Last updated": this.lastUpdated,
            "Depth": this.depth,
            "Lattitude": this.lattitude,
            "Longitude": this.longitude
        }
    }
}
function getBinByMac(mac) {return bins.find(e => {return e.mac == mac})}

//new Bin("4C11AE35387");

app.post('/', (req, res) => {
    const time = Date.now()

    console.log('post recieved at', getVisualTime())

    res.send(`LOOPDELAY=5000;`)

    const data = {}
    Object.keys(req.body).forEach(e => {
        data[e] = req.body[e]
    })

    console.log(data)


    if (!getBinByMac(data.MAC)) {new Bin(data.MAC)}
    let bin = getBinByMac(data.MAC)

    for (let i = 0; i < String(data.Len); i++) {
        bin.update({
            Lat: data.Lat,
            Lon: data.Lon,
            Depth: data[`Depth${i}`]
        }, time)
    }
})

const port = 3000

server.listen(port, () => {
    console.log(`listening on port \x1b[34m${port}\x1b[0m`)
});



function logLineToFile(line, mac) {
    let path = __dirname + '/logs/' + mac + '.txt'

    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, '')
    }

    fs.appendFileSync(path, line + '\n')
}


function getVisualTime(date) {
    date = date || new Date()
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
}