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
        it('should not return jpeg dogs when filter is jpg', async () => {
            fsLayer.getGoodDogs.resolves(['testdog.jpg', 'dog.png', 'testdog.jpg'])
            return request(await createApp('testhost'))
                .get('/woof?filter=jpg')
                .expect('Content-Type', /text\/html/)
                .expect(200)
                .then(response => {
                    expect(response.text).to.equal('dog.png')
                })
        })
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
        it('should not return jpeg dogs when filter is jpg', async () => {
            fsLayer.getGoodDogs.resolves(['testdog.jpg', 'dog.png', 'testdog.jpg'])
            return request(await createApp('testhost'))
                .get('/woof.json?filter=jpg')
                .expect('Content-Type', /json/)
                .expect(200)
                .then(response => {
                    expect(response.body.url).to.equal('testhost/dog.png')
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
        it('should return filtered dogs', async () => {
            fsLayer.getGoodDogs.resolves(['doga.jpg', 'dogb.png'])
            return request(await createApp('testhost'))
                .get('/doggos?filter=jpg')
                .expect('Content-Type', /application\/json/)
                .expect(200)
                .then(response => {
                    expect(response.body).to.deep.equal(['dogb.png'])
                })
        })
    })
})