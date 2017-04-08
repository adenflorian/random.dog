const express = require("express")
const hbs = require("handlebars")
const fs = require("fs")

// Should be run behind a reverse proxy
const domain = "random.dog"
const privatePort = 8080
const host = `https://random.dog`

Array.prototype.random = function() {
    return this[Math.floor(Math.random() * this.length)]
}

var app = express()

app.use(function(req, res, next) {
	console.log('NEW REQUEST: ' + getDateTime() + ' EST - NYC')
	console.log('requestor IP: ' + req.connection.remoteAddress)
	console.log('action: ' + req.url)
	next()
})

var helloworld = hbs.compile(fs.readFileSync("./helloworld.hbs", "utf8"))

var cache = fs.readdirSync("./img")

var refresher = setInterval(() => {
	fs.readdir("./img", (err, files) => {
		if (err) return console.error(err.stack)
		cache = files
	})
}, 20000)

// API
app.get("/woof.json", (req, res) => {
	res.status(200).json({
		url: `${host}/${cache.random()}`
	})
})
app.get("/woof", (req, res) => {
	res.status(200).send(cache.random())
})

app.get("/", (req, res) => {
	res.status(200).send(helloworld({dog: `/${cache.random()}`}))
})
app.get("*", express.static("./img"))

app.listen(privatePort, (err) => {
	if (err) return console.error(err.stack)
	console.log(`Dogs barking at ${host}`)
})

function getDateTime() {
    var date = new Date()

    var hour = date.getHours()
    hour = (hour < 10 ? "0" : "") + hour

    var min  = date.getMinutes()
    min = (min < 10 ? "0" : "") + min

    var sec  = date.getSeconds()
    sec = (sec < 10 ? "0" : "") + sec

    var year = date.getFullYear()

    var month = date.getMonth() + 1
    month = (month < 10 ? "0" : "") + month

    var day  = date.getDate()
    day = (day < 10 ? "0" : "") + day

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec
}
