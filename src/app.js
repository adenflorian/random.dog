import bodyParser from 'body-parser'
import express from 'express'
import fileUpload from 'express-fileupload'
import path from 'path'
import ua from 'universal-analytics'
import uuidV4 from 'uuid/v4'
import exphbs from 'express-handlebars'
import {List} from 'immutable'
import {checkHash} from './hash-util'
import {dogFolderName, getDoggoCount, getGoodDogs, getNewDogs, rejectDog, adoptDog} from './fs-layer'
import {DogError} from './dog-error'
import {DogCache} from './DogCache'

let immortalDoggos = 0

async function updateDoggoCount() {
    immortalDoggos = await getDoggoCount()
}

updateDoggoCount()

const jsonParser = bodyParser.json()

export const createApp = async (host) => {
    let cache = new DogCache(new List(await getGoodDogs()))

    setInterval(() => {
        updateCache()
    }, 20000)

    async function updateCache() {
        try {
            const goodDogs = await getGoodDogs()
            cache = new DogCache(new List(goodDogs))
            updateDoggoCount()
        } catch (error) {
            console.error(error.stack)
        }
    }

    const app = express()

    app.engine('handlebars', exphbs({defaultLayout: false}))

    app.set('view engine', 'handlebars')

    app.use(ua.middleware('UA-50585312-4', {cookieName: '_ga', https: true}))

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

    // API
    app.get('*', (req, res, next) => {
        req.visitor.pageview('*').send()
        if (req.query.bone && checkHash(req.query.bone) === true) {
            express.static(dogFolderName.new)(req, res, next)
        } else {
            express.static(dogFolderName.approved)(req, res, next)
        }
    })

    app.get('/woof', (req, res) => {
        req.visitor.pageview(req.path).send()
        res.status(200).send(getDogsMaybeWithFilter(req).random())
    })

    app.get('/woof.json', (req, res) => {
        req.visitor.pageview(req.path).send()
        res.status(200).json({
            url: `${host}/${getDogsMaybeWithFilter(req).random()}`
        })
    })

    app.get('/doggos', async (req, res) => {
        req.visitor.pageview(req.path).send()
        res.status(200).json(getDogsMaybeWithFilter(req))
    })

    function getDogsMaybeWithFilter(req) {
        if (req.query.filter) {
            const filters = req.query.filter.split(',')
            return cache.applyFilters(filters)
        } else {
            return cache
        }
    }

    app.post('/upload', async (req, res) => {
        req.visitor.pageview('POST ' + req.path).send()
        if (!req.files) return res.status(400).send('No files were uploaded.')

        const newDogs = await getNewDogs()

        // Limit number of files in newdoggos folder to 250
        if (newDogs.length >= 250) {
            return res.status(200).send('Too many new doggos awaiting adoption, please try again later')
        }

        const uploadedFile = req.files.upload_file

        const acceptedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'video/mp4', 'video/webm']

        if (acceptedMimeTypes.indexOf(uploadedFile.mimetype) == -1) {
            return res.status(400).send('Only png, jpeg, gif, mp4, and webm doggos allowed')
        }

        uploadedFile.mv('./newdoggos/' + uuidV4() + path.extname(uploadedFile.name))

        req.visitor.event('upload', 'successful upload')
        return res.status(200).send('Doggo adopted!')
    })

    app.post('/review', jsonParser, async ({visitor, path, query, body}, res) => {
        visitor.pageview(path).send()

        if (!query.bone || checkHash(query.bone) === false) throw new DogError('no cats allowed', 401)
        if (!body) throw new DogError('missing body', 400)

        const dogName = body.dogName

        if (['reject', 'adopt'].includes(body.action) === false) throw new DogError('bad action', 400)

        if (!dogName || dogName.length < 3) throw new DogError('bad dogName', 400)

        if (body.action === 'reject') {
            adoptOrReject(rejectDog, dogName, res, 'dog rejected', visitor)
        } else {
            adoptOrReject(adoptDog, dogName, res, 'dog adopted', visitor)
        }

        async function adoptOrReject(fn, dogName, res, message, visitor) {
            await fn(dogName)
            updateCache()
            visitor.event('review', message)
            res.status(200).send(message)
        }
    })

    // Pages
    app.get('/', (req, res) => {
        req.visitor.pageview(req.path).send()
        const doggo = cache.random()

        res.render('helloworld.handlebars', {
            [getDogType(doggo)]: doggo,
            adopted: immortalDoggos
        })
    })

    app.get('/upload', async (req, res) => {
        req.visitor.pageview(req.path).send()

        const newDogs = await getNewDogs()

        res.render('upload', {dog: newDogs, waitingdogs: newDogs.length})
    })

    app.get('/review', async (req, res) => {
        req.visitor.pageview(req.path).send()

        if (!req.query.bone || checkHash(req.query.bone) === false) return res.sendStatus(401)

        const newDogs = await getNewDogs()

        if (newDogs.length === 0) return res.status(200).send('no doggos to review')

        const doggo = newDogs[0]

        res.render('review', {
            [getDogType(doggo)]: doggo,
            dog: doggo,
            bone: req.query.bone
        })
    })

    // Other
    app.get('/favicon.ico', (req, res, next) => {
        req.visitor.pageview('/favicon.ico').send()
        express.static('.')(req, res, next)
    })

    // eslint-disable-next-line no-unused-vars
    app.use(function (err, req, res, next) {
        if (isDogErrorType400(err)) {
            return res.status(err.dogErrorType).send(err.message)
        } else {
            console.error(err.stack)
            res.status(500).send('something broke')
        }
    })

    return app
}

function getDogType(doggo) {
    return path.extname(doggo) == '.mp4' || path.extname(doggo) == '.webm' ? 'dogmp4' : 'dogimg'
}

function isDogErrorType400(err) {
    return err.dogErrorType && err.dogErrorType >= 400 && err.dogErrorType < 500
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
