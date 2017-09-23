const bodyParser = require('body-parser')
const express = require('express')
const fileUpload = require('express-fileupload')
const fs = require('fs-extra')
const hbs = require('handlebars')
const path = require('path')
const ua = require('universal-analytics')
const uuidV4 = require('uuid/v4')
const bcrypt = require('bcrypt')

console.log('*****************************');
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('*****************************');

// Should be run behind a reverse proxy
const domain = 'random.dog'
const privatePort = 8080
const host = `https://random.dog`

Array.prototype.random = function () {
	return this[Math.floor(Math.random() * this.length)]
}

const newDogFolderName = 'newdoggos';
const approvedDogFolderName = 'img';
const rejectDogFolderName = 'rejects';

fs.ensureDirSync('./' + newDogFolderName)
fs.ensureDirSync('./' + approvedDogFolderName)
fs.ensureDirSync('./' + rejectDogFolderName)

var immortalDoggos = 0;

function checkHash(password) {
	return bcrypt.compareSync(password, secret)
}

function updateDoggoCount() {
	fs.readdir('./' + approvedDogFolderName, (err, files) => {
		if (err) {
			console.log(err)
			return;
		}
		immortalDoggos = files.length
	})
}

updateDoggoCount()

const app = express()
const jsonParser = bodyParser.json()

app.use(ua.middleware('UA-50585312-4', {cookieName: '_ga', https: true}));

app.use(fileUpload({
	limits: {
		fileSize: 50 * 1024 * 1024,
		fields: 100,
		files: 1,
		parts: 101
	},
}))

app.use((req, res, next) => {
	console.log('NEW REQUEST: ' + getDateTime() + ' EST - NYC')
	console.log(`requestor ip: ${req.connection.remoteAddress}`)
	console.log(`${req.method} ${req.url}`)
	next()
})

app.use((err, req, res, next) => {
	// logic
})

var helloworld = hbs.compile(fs.readFileSync('./views/helloworld.hbs', 'utf8'))
var upload = hbs.compile(fs.readFileSync('./views/upload.hbs', 'utf8'))
var review = hbs.compile(fs.readFileSync('./views/review.hbs', 'utf8'))

var cache = fs.readdirSync('./' + approvedDogFolderName)

var refresher = setInterval(() => {
	updateCache()
}, 20000)

function updateCache() {
	fs.readdir('./' + approvedDogFolderName, (err, files) => {
		if (err) return console.error(err.stack)
		cache = files
	})
	updateDoggoCount()
}

// API
app.get('/woof.json', (req, res) => {
	req.visitor.pageview(req.path).send()
	res.status(200).json({
		url: `${host}/${cache.random()}`
	})
})

app.get('/woof', (req, res) => {
	req.visitor.pageview(req.path).send()
	res.status(200).send(cache.random())
})

app.get('/', (req, res) => {
	req.visitor.pageview(req.path).send()
	var doggo = cache.random()
	if (path.extname(doggo) == '.mp4') {
		res.status(200).send(helloworld({dogmp4: doggo, adopted: immortalDoggos}))
	} else {
		res.status(200).send(helloworld({dogimg: doggo, adopted: immortalDoggos}))
	}
})

app.get('*', (req, res, next) => {
	req.visitor.pageview('*').send()
	if (req.query.bone && checkHash(req.query.bone) === true) {
		express.static('./' + newDogFolderName)(req, res, next)
	} else {
		express.static('./' + approvedDogFolderName)(req, res, next)
	}
})

app.get('/favicon.*', (req, res, next) => {
	req.visitor.pageview("/favicon.*").send()
	express.static(".")(req, res, next)
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

app.get('/review', (req, res) => {
	req.visitor.pageview(req.path).send()
	if (!req.query.bone || checkHash(req.query.bone) === false) return res.sendStatus(401)
	fs.readdir('./' + newDogFolderName + '/', (err, files) => {
		if (err) {
			console.log(err)
			return res.status(500).send('i broke')
		}
		if (files.length === 0) return res.status(200).send('no doggos to review')
		const doggo = files[0]
		if (path.extname(doggo) == '.mp4') {
			res.status(200).send(review({dogmp4: doggo, dog: doggo, bone: req.query.bone}))
		} else {
			res.status(200).send(review({dogimg: doggo, dog: doggo, bone: req.query.bone}))
		}
	})
})

const secret = JSON.parse(fs.readFileSync('./secret.json', 'utf8')).secret

app.post('/review', jsonParser, (req, res) => {
	req.visitor.pageview(req.path).send()
	if (!req.query.bone || checkHash(req.query.bone) === false) return res.sendStatus(401)
	if (!req.body) return res.sendStatus(400)
	const dogName = req.body.dogName;
	if (req.body.action === 'reject') {
		if (!dogName || dogName.length < 3) {
			return res.status(400).send('bad dogName')
		}
		const rejectDogPath = `./${newDogFolderName}/${dogName}`;
		fs.exists(rejectDogPath, exists => {
			if (exists === false) return res.status(400).send('dogName no exist')
			fs.move(rejectDogPath, `./${rejectDogFolderName}/${dogName}`, {overwrite: true})
				.then(() => {
					updateCache()
					return res.status(200).send('dog rejected')
				})
				.catch(err => {
					console.log(err)
					return res.status(500).send('something broke')
				})
		})
	} else if (req.body.action === 'adopt') {
		if (!dogName || dogName.length < 3) {
			return res.status(400).send('bad dogName')
		}
		const newDogPath = `./${newDogFolderName}/${dogName}`;
		fs.exists(newDogPath, exists => {
			if (exists === false) return res.status(400).send('dogName no exist')
			fs.move(newDogPath, `./${approvedDogFolderName}/${dogName}`, {overwrite: true})
				.then(() => {
					updateCache()
					return res.status(200).send('dog adopted')
				})
				.catch(err => {
					console.log(err)
					return res.status(500).send('something broke')
				})
		})
	} else {
		return res.status(400).send('bad action')
	}
})

app.listen(privatePort, (err) => {
	if (err) return console.error(err.stack)
	console.log(`Dogs barking at ${host}`)
})

function getDateTime() {
	var date = new Date()

	var hour = date.getHours()
	hour = (hour < 10 ? "0" : "") + hour

	var min = date.getMinutes()
	min = (min < 10 ? "0" : "") + min

	var sec = date.getSeconds()
	sec = (sec < 10 ? "0" : "") + sec

	var year = date.getFullYear()

	var month = date.getMonth() + 1
	month = (month < 10 ? "0" : "") + month

	var day = date.getDate()
	day = (day < 10 ? "0" : "") + day

	return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec
}
