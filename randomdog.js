const express = require('express')
const fileUpload = require('express-fileupload')
const fs = require('fs-extra')
const hbs = require('handlebars')
const path = require('path')
const ua = require('universal-analytics')
const uuidV4 = require('uuid/v4')

// Should be run behind a reverse proxy
const domain = 'random.dog'
const privatePort = 8080
const host = `https://random.dog`

Array.prototype.random = function() {
    return this[Math.floor(Math.random() * this.length)]
}

fs.ensureDirSync('./newdoggos')
fs.ensureDirSync('./img')

var immortalDoggos = 0;

function updateDoggoCount() {
	fs.readdir('./img', (err, files) => {
		if (err) {
			console.log(err)
			return;
		}
		immortalDoggos = files.length
	})
}

updateDoggoCount()

var app = express()

app.use(ua.middleware('UA-50585312-4', { cookieName: '_ga', https: true }));

app.use(fileUpload({
	limits: {
		fileSize: 50 * 1024 * 1024,
		fields: 100,
		files: 1,
		parts: 101
	},
}))

app.use(function (req, res, next) {
	console.log('NEW REQUEST: ' + getDateTime() + ' EST - NYC')
	console.log('requestor IP: ' + req.connection.remoteAddress)
	console.log('action: ' + req.url)
	console.log('method: ' + req.method)
	next()
})

var helloworld = hbs.compile(fs.readFileSync("./helloworld.hbs", "utf8"))
var upload = hbs.compile(fs.readFileSync("./upload.hbs", "utf8"))

var cache = fs.readdirSync("./img")

var refresher = setInterval(() => {
	fs.readdir("./img", (err, files) => {
		if (err) return console.error(err.stack)
		cache = files
	})
	updateDoggoCount()
}, 20000)

// API
app.get("/woof.json", (req, res) => {
	req.visitor.pageview(req.path).send()
	res.status(200).json({
		url: `${host}/${cache.random()}`
	})
})

app.get("/woof", (req, res) => {
	req.visitor.pageview(req.path).send()
	res.status(200).send(cache.random())
})

app.get("/", (req, res) => {
	req.visitor.pageview(req.path).send()
	var doggo = cache.random()
	if (path.extname(doggo) == '.mp4') {
		res.status(200).send(helloworld({ dogmp4: doggo, adopted: immortalDoggos }))
	} else {
		res.status(200).send(helloworld({ dogimg: doggo, adopted: immortalDoggos }))
	}
})

app.get("*", (req, res, next) => {
	req.visitor.pageview("*").send()
	express.static("./img")(req, res, next)
})

app.get('/upload', (req, res) => {
	req.visitor.pageview(req.path).send()
	fs.readdir('./newdoggos/', (err, files) => {
		res.status(200).send(upload({
			dog: files,
			waitingdogs: files.length
		}))
	})
})

app.post('/upload', (req, res) => {
	req.visitor.pageview('POST ' + req.path).send()
	if (!req.files) return res.status(400).send('No files were uploaded.')

	// Limit number of files in newdoggos folder to 50
	if (fs.readdirSync('newdoggos').length >= 50) {
		return res.status(200).send('Too many new doggos awaiting adoption, please try again later')
	}

	var uploadedFile = req.files.upload_file

	var acceptedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'video/mp4']

	if (acceptedMimeTypes.indexOf(uploadedFile.mimetype) == -1) {
		return res.status(400).send('Only png, jpeg, gif, and mp4 doggos allowed')
	}

	uploadedFile.mv('./newdoggos/' + uuidV4() + path.extname(uploadedFile.name))

	return res.status(200).send('Doggo adopted!')
})

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
