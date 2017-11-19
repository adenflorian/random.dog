import {createApp} from './app'

console.log('*****************************')
console.log('process.env.NODE_ENV:', process.env.NODE_ENV)
console.log('*****************************')

// Should be run behind a reverse proxy
const privatePort = 8080
const host = 'https://random.dog'

createApp(host)
	.then(app => {
		app.listen(privatePort, (err) => {
			if (err) return console.error(err.stack)
			console.log(`Dogs barking at ${host}`)
		})
	})
