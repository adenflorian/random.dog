import bodyParser from 'body-parser'
import express from 'express'
import fileUpload from 'express-fileupload'
import fs from 'fs-extra'
import hbs from 'handlebars'
import path from 'path'
import ua from 'universal-analytics'
import uuidV4 from 'uuid/v4'
import {checkHash} from './hash-util'

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)]
}

const appRoot = './'

const newDogFolderName = 'newdoggos'
const approvedDogFolderName = 'img'
const rejectDogFolderName = 'rejects'

fs.ensureDirSync(appRoot + newDogFolderName)
fs.ensureDirSync(appRoot + approvedDogFolderName)
fs.ensureDirSync(appRoot + rejectDogFolderName)

let immortalDoggos = 0

function updateDoggoCount() {
    fs.readdir(appRoot + approvedDogFolderName, (err, files) => {
        if (err) {
            console.log(err)
            return
        }
        immortalDoggos = files.length
    })
}

updateDoggoCount()

const jsonParser = bodyParser.json()

export const setup = (app, host) => {
    app.use(ua.middleware('UA-50585312-4', { cookieName: '_ga', https: true }))

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

    const viewsFolderPath = appRoot + 'views/'

    const helloworld = hbs.compile(fs.readFileSync(viewsFolderPath + 'helloworld.hbs', 'utf8'))
    const upload = hbs.compile(fs.readFileSync(viewsFolderPath + 'upload.hbs', 'utf8'))
    const review = hbs.compile(fs.readFileSync(viewsFolderPath + 'review.hbs', 'utf8'))

    let cache = fs.readdirSync(appRoot + approvedDogFolderName)

    setInterval(() => {
        updateCache()
    }, 20000)

    function updateCache() {
        fs.readdir(appRoot + approvedDogFolderName, (err, files) => {
            if (err) return console.error(err.stack)
            cache = files
        })
        updateDoggoCount()
    }

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
        const doggo = cache.random()
        if (path.extname(doggo) == '.mp4') {
            res.status(200).send(helloworld({ dogmp4: doggo, adopted: immortalDoggos }))
        } else {
            res.status(200).send(helloworld({ dogimg: doggo, adopted: immortalDoggos }))
        }
    })

    app.get('/doggos', (req, res) => {
        req.visitor.pageview(req.path).send()
        fs.readdir(appRoot + approvedDogFolderName, (err, files) => {
            if (err) {
                console.log(err)
                res.status(500).send()
            } else {
                res.status(200).json(files)
            }
        })
    })

    app.get('*', (req, res, next) => {
        req.visitor.pageview('*').send()
        if (req.query.bone && checkHash(req.query.bone) === true) {
            express.static(appRoot + newDogFolderName)(req, res, next)
        } else {
            express.static(appRoot + approvedDogFolderName)(req, res, next)
        }
    })

    app.get('/favicon.ico', (req, res, next) => {
        req.visitor.pageview('/favicon.ico').send()
        express.static(appRoot)(req, res, next)
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

        // Limit number of files in newdoggos folder to 250
        if (fs.readdirSync('newdoggos').length >= 250) {
            return res.status(200).send('Too many new doggos awaiting adoption, please try again later')
        }

        const uploadedFile = req.files.upload_file

        const acceptedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'video/mp4']

        if (acceptedMimeTypes.indexOf(uploadedFile.mimetype) == -1) {
            return res.status(400).send('Only png, jpeg, gif, and mp4 doggos allowed')
        }

        uploadedFile.mv('./newdoggos/' + uuidV4() + path.extname(uploadedFile.name))

        return res.status(200).send('Doggo adopted!')
    })

    app.get('/review', (req, res) => {
        req.visitor.pageview(req.path).send()
        if (!req.query.bone || checkHash(req.query.bone) === false) return res.sendStatus(401)
        fs.readdir(appRoot + newDogFolderName + '/', (err, files) => {
            if (err) {
                console.log(err)
                return res.status(500).send('i broke')
            }
            if (files.length === 0) return res.status(200).send('no doggos to review')
            const doggo = files[0]
            if (path.extname(doggo) == '.mp4') {
                res.status(200).send(review({ dogmp4: doggo, dog: doggo, bone: req.query.bone }))
            } else {
                res.status(200).send(review({ dogimg: doggo, dog: doggo, bone: req.query.bone }))
            }
        })
    })

    app.post('/review', jsonParser, (req, res) => {
        req.visitor.pageview(req.path).send()
        if (!req.query.bone || checkHash(req.query.bone) === false) return res.sendStatus(401)
        if (!req.body) return res.sendStatus(400)
        const dogName = req.body.dogName
        if (req.body.action === 'reject') {
            if (!dogName || dogName.length < 3) {
                return res.status(400).send('bad dogName')
            }
            const rejectDogPath = `./${newDogFolderName}/${dogName}`
            fs.exists(rejectDogPath, exists => {
                if (exists === false) return res.status(400).send('dogName no exist')
                fs.move(rejectDogPath, `./${rejectDogFolderName}/${dogName}`, { overwrite: true })
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
            const newDogPath = `./${newDogFolderName}/${dogName}`
            fs.exists(newDogPath, exists => {
                if (exists === false) return res.status(400).send('dogName no exist')
                fs.move(newDogPath, `./${approvedDogFolderName}/${dogName}`, { overwrite: true })
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
}

function getDateTime() {
    const date = new Date()

    let hour = date.getHours()
    hour = (hour < 10 ? '0' : '') + hour

    let min = date.getMinutes()
    min = (min < 10 ? '0' : '') + min

    let sec = date.getSeconds()
    sec = (sec < 10 ? '0' : '') + sec

    let year = date.getFullYear()

    let month = date.getMonth() + 1
    month = (month < 10 ? '0' : '') + month

    let day = date.getDate()
    day = (day < 10 ? '0' : '') + day

    return year + ':' + month + ':' + day + ':' + hour + ':' + min + ':' + sec
}
