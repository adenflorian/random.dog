import {expect} from 'chai'
import sinon from 'sinon'
import request from 'supertest'
import {createApp} from '../src/app'
import * as fsLayer from '../src/fs-layer'

describe('randomdog', () => {
    before(() => {
        sinon.stub(fsLayer, 'getGoodDogs')
    })
    after(() => {
        fsLayer.getGoodDogs.restore()
    })
    describe('get /woof.json', () => {
        it('should go woof', async () => {
            fsLayer.getGoodDogs.resolves(['testdog.jpg'])
            return request(await createApp('testhost'))
                .get('/woof.json')
                .expect('Content-Type', /json/)
                .expect(200)
                .then(response => {
                    expect(response.body.url).to.equal('testhost/testdog.jpg')
                })
        })
    })
    describe('get /woof', () => {
        it('should go woof', async () => {
            fsLayer.getGoodDogs.resolves(['testdog.jpg'])
            return request(await createApp('testhost'))
                .get('/woof')
                .expect('Content-Type', /text\/html/)
                .expect(200)
                .then(response => {
                    expect(response.text).to.equal('testdog.jpg')
                })
        })
    })
    describe('get /doggos', () => {
        it('should return a lot of dogs', async () => {
            fsLayer.getGoodDogs.resolves(['doga', 'dogb'])
            return request(await createApp('testhost'))
                .get('/doggos')
                .expect('Content-Type', /application\/json/)
                .expect(200)
                .then(response => {
                    expect(response.body).to.deep.equal(['doga', 'dogb'])
                })
        })
    })
})