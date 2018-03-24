import {expect} from 'chai'
import sinon from 'sinon'
import request from 'supertest'
import {createApp} from '../src/app'
import * as fsLayer from '../src/fs-layer'
import * as hashUtil from '../src/hash-util'

describe('randomdog', () => {
    let sandbox
    before(() => {
        sandbox = sinon.sandbox.create()
        sandbox.stub(fsLayer, 'getGoodDogs').resolves(['testDog.jpg'])
        sandbox.stub(fsLayer, 'adoptDog')
        sandbox.stub(hashUtil, 'checkHash').callsFake(key => key === 'goodKey')
    })
    after(() => {
        sandbox.restore()
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
            fsLayer.getGoodDogs.resolves(['testdog.JPG', 'dog.png', 'testdog.jpg'])
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
            fsLayer.getGoodDogs.resolves(['testdog.jpg', 'dog.png', 'testdog.JPG'])
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
            fsLayer.getGoodDogs.resolves(['doga.Jpg', 'dogb.png'])
            return request(await createApp('testhost'))
                .get('/doggos?filter=jpg')
                .expect('Content-Type', /application\/json/)
                .expect(200)
                .then(response => {
                    expect(response.body).to.deep.equal(['dogb.png'])
                })
        })
    })
    describe('/review', () => {
        describe('unauthorized', () => {
            ['get', 'post'].forEach(method => {
                describe(method, () => {
                    it('should return 401 when bone cookie not present', async () => {
                        return request(await createApp('testhost'))[method]('/review')
                            .set('Cookie', 'treat=goodKey')
                            .expect(401)
                    })
                    it('should return 401 when bone cookie is badKey', async () => {
                        return request(await createApp('testhost'))[method]('/review')
                            .set('Cookie', 'bone=badKey')
                            .expect(401)
                    })
                    it('should return 401 when bone cookie is decoded goodKey', async () => {
                        return request(await createApp('testhost'))[method]('/review')
                            .set('Cookie', 'bone=' + 'goodKey')
                            .expect(401)
                    })
                })
            })
        })
        describe('authorized', () => {
            describe('get', () => {
                it('should return 200 when bone cookie is encoded goodKey', async () => {
                    return request(await createApp('testhost'))
                        .get('/review')
                        .set('Cookie', 'bone=' + Buffer.from('goodKey').toString('base64'))
                        .expect(200)
                })
            })
            describe('post', () => {
                it('should return 200 when bone cookie is encoded goodKey', async () => {
                    return request(await createApp('testhost'))
                        .post('/review')
                        .set('Cookie', 'bone=' + Buffer.from('goodKey').toString('base64'))
                        .send({action: 'adopt', dogName: 'cliff'})
                        .expect(200)
                })
            })
        })
    })
})
