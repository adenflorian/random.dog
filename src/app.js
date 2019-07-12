import bodyParser from 'body-parser'
import express from 'express'
import fileUpload from 'express-fileupload'
import cookieParser from 'cookie-parser'
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

    app.use(cookieParser())

    app.use(fileUpload({
        limits: {
            fileSize: 50 * 1024 * 1024,
            fields: 100,
            files: 1,
            parts: 101
        },
    }))

    app.use((req, res, next) => {
        log(`NEW REQUEST: ${getDateTime()} EST - NYC | ${req.method} ${req.url} ${req.body ? JSON.stringify(req.body) : ''}`)
        next()
    })

    function setCORSHeaders(res) {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
        res.header('Access-Control-Allow-Methods', 'GET')
    }

    // API
    app.get('*', (req, res, next) => {
        req.visitor.event('*', 'GET', 'api').send()
        setCORSHeaders(res)

        if (req.headers.referer && req.headers.referer.endsWith('/review')) {
            if (isAuthorized(req) !== true) {
                req.visitor.event('/review/*', 'GET 401 Unauthorized', 'api').send()
                return next(new DogError('no cats allowed :P', 401))
            }
            express.static(dogFolderName.new)(req, res, next)
        } else {
            express.static(dogFolderName.approved)(req, res, next)
        }
    })

    app.get('/woof', (req, res) => {
        req.visitor.event('woof', 'GET', 'api').send()
        setCORSHeaders(res)
        res.status(200).send(getDogsMaybeWithFilter(req).random())
    })

    app.get('/woof.json', (req, res) => {
        req.visitor.event('woof.json', 'GET', 'api').send()
        setCORSHeaders(res)
        res.status(200).json({
            url: `${host}/${getDogsMaybeWithFilter(req).random()}`
        })
    })

    app.get('/doggos', async (req, res) => {
        req.visitor.event('doggos', 'GET', 'api').send()
        setCORSHeaders(res)
        res.status(200).json(getDogsMaybeWithFilter(req))
    })

    function getDogsMaybeWithFilter(req) {
        if (req.query.filter) {
            const filters = req.query.filter.split(',')
            return cache.applyFilters(filters, false)
        } else if (req.query.include) {
            const includes = req.query.include.split(',')
            return cache.applyFilters(includes, true)
        } else {
            return cache
        }
    }

    app.post('/upload', async (req, res) => {
        req.visitor.event('upload', 'POST', 'api').send()

        if (!req.files) {
            req.visitor.event('upload', '400 No files were uploaded', 'api').send()
            return res.status(400).send('No files were uploaded.')
        }

        const newDogs = await getNewDogs()

        // Limit number of files in newdoggos folder to 250
        if (newDogs.length >= 250) {
            req.visitor.event('upload', 'Too many new doggos', 'api').send()
            return res.status(200).send('Too many new doggos awaiting adoption, please try again later')
        }

        const uploadedFile = req.files.upload_file

        const acceptedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'video/mp4', 'video/webm']

        if (acceptedMimeTypes.indexOf(uploadedFile.mimetype) == -1) {
            req.visitor.event('upload', '400 bad file type', 'api').send()
            return res.status(400).send('Only png, jpeg, gif, mp4, and webm doggos allowed')
        }

        uploadedFile.mv('./newdoggos/' + uuidV4() + path.extname(uploadedFile.name))

        req.visitor.event('upload', 'successful upload', 'api').send()
        return res.status(200).send('Doggo adopted!')
    })

    app.post('/review', jsonParser, async (req, res, next) => {
        const {visitor, body} = req

        visitor.event('review', 'POST', 'api').send()

        if (isAuthorized(req) !== true) {
            visitor.event('review', '401 Unauthorized', 'api').send()
            return next(new DogError('no cats allowed', 401))
        }

        if (!body) {
            visitor.event('review', '400 missing body', 'api').send()
            return next(new DogError('missing body', 400))
        }

        const dogName = body.dogName

        if (['reject', 'adopt'].includes(body.action) === false) {
            visitor.event('review', '400 bad action', 'api').send()
            return next(new DogError('bad action', 400))
        }

        if (!dogName || dogName.length < 3) {
            visitor.event('review', '400 bad dogName', 'api').send()
            return next(new DogError('bad dogName', 400))
        }

        try {
            if (body.action === 'reject') {
                await adoptOrReject(rejectDog, dogName, res, 'dog rejected', visitor)
            } else {
                await adoptOrReject(adoptDog, dogName, res, 'dog adopted', visitor)
            }
        } catch (error) {
            return next(error)
        }

        async function adoptOrReject(fn, dogName, res, message, visitor) {
            await fn(dogName)
            updateCache()
            visitor.event('review', message, 'api').send()
            log(`${message}: ${dogName}`)
            res.status(200).send(message)
        }
    })

    // Pages
    app.get('/', (req, res) => {
        req.visitor.event('/', 'GET', 'api').send()
        const doggo = cache.random()

        res.render('helloworld.handlebars', {
            [getDogType(doggo)]: doggo,
            adopted: immortalDoggos
        })
    })

    app.get('/upload', async (req, res) => {
        req.visitor.event('upload', 'GET', 'api').send()

        const newDogs = await getNewDogs()

        res.render('upload', {dog: newDogs, waitingdogs: newDogs.length})
    })

    app.get('/review', async (req, res) => {
        req.visitor.event('review', 'GET', 'api').send()

        if (isAuthorized(req) !== true) {
            req.visitor.event('review', 'GET-unauthorized', 'api').send()
            return res.sendStatus(401)
        }

        const newDogs = await getNewDogs()

        if (newDogs.length === 0) return res.status(200).send('no doggos to review')

        const doggo = newDogs[0]

        res.render('review', {
            [getDogType(doggo)]: doggo,
            dog: doggo,
            bone: req.query.bone,
            waitingdogs: newDogs.length,
            s: newDogs.length > 1 ? 's' : ''
        })
    })

    // Other
    app.get('/favicon.ico', (req, res, next) => {
        req.visitor.event('favicon.ico', 'GET', 'api').send()
        express.static('.')(req, res, next)
    })
    app.get('/sitemap.txt', (req, res, next) => {
        req.visitor.event('sitemap.txt', 'GET', 'api').send()
        express.static('.')(req, res, next)
    })

    // eslint-disable-next-line no-unused-vars
    app.use(function (err, req, res, next) {
        if (isDogErrorType400(err)) {
            return res.status(err.dogErrorType).send(err.message)
        } else {
            console.error(err.stack)
            return res.status(500).send('something broke')
        }
    })

    return app
}



function isAuthorized(req) {
    if (!req.cookies.bone) return false
    return checkHash(Buffer.from(req.cookies.bone, 'base64').toString('ascii'))
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

function log(message) {
    if (process.env.NODE_ENV === 'test') return
    console.log(message)
}
