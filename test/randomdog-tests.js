import {expect} from 'chai'
import sinon from 'sinon'
import request from 'supertest'
import express from 'express'
import {createApp} from '../src/app'
import * as fsLayer from '../src/fs-layer'
import * as hashUtil from '../src/hash-util'

describe('randomdog', () => {
    let sandbox
    beforeEach(() => {
        sandbox = sinon.sandbox.create()
        sandbox.stub(fsLayer, 'getGoodDogs').resolves(['testDog.jpg'])
        sandbox.stub(fsLayer, 'adoptDog')
        sandbox.stub(hashUtil, 'checkHash').callsFake(key => key === 'goodKey')
    })
    afterEach(() => {
        sandbox.restore()
    })
    describe('get /woof', () => {
        it('should go woof', async () => {
            // @ts-ignore
            fsLayer.getGoodDogs.resolves(['testDog.jpg'])
            return request(await createApp('test_host'))
                .get('/woof')
                .expect('Content-Type', /text\/html/)
                .expect(200)
                .then(response => {
                    expect(response.text).to.equal('testDog.jpg')
                })
        })
        it('should not return jpeg dogs when filter is jpg', async () => {
            // @ts-ignore
            fsLayer.getGoodDogs.resolves(['testDog.JPG', 'dog.png', 'testDog.jpg'])
            return request(await createApp('test_host'))
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
            // @ts-ignore
            fsLayer.getGoodDogs.resolves(['testDog.jpg'])
            return request(await createApp('test_host'))
                .get('/woof.json')
                .expect('Content-Type', /json/)
                .expect(200)
                .then(response => {
                    expect(response.body.url).to.equal('test_host/testDog.jpg')
                })
        })
        it('should not return jpeg dogs when filter is jpg', async () => {
            // @ts-ignore
            fsLayer.getGoodDogs.resolves(['testDog.jpg', 'dog.png', 'testDog.JPG'])
            return request(await createApp('test_host'))
                .get('/woof.json?filter=jpg')
                .expect('Content-Type', /json/)
                .expect(200)
                .then(response => {
                    expect(response.body.url).to.equal('test_host/dog.png')
                })
        })
    })
    describe('get /doggos', () => {
        it('should return a lot of dogs', async () => {
            // @ts-ignore
            fsLayer.getGoodDogs.resolves(['dogA', 'dogB'])
            return request(await createApp('test_host'))
                .get('/doggos')
                .expect('Content-Type', /application\/json/)
                .expect(200)
                .then(response => {
                    expect(response.body).to.deep.equal(['dogA', 'dogB'])
                })
        })
        it('should return filtered dogs', async () => {
            // @ts-ignore
            fsLayer.getGoodDogs.resolves(['dogA.Jpg', 'dogB.png'])
            return request(await createApp('test_host'))
                .get('/doggos?filter=jpg')
                .expect('Content-Type', /application\/json/)
                .expect(200)
                .then(response => {
                    expect(response.body).to.deep.equal(['dogB.png'])
                })
        })
    })
    describe('get *', () => {
        it('should return 401 when referred from /review and no bone', async () => {
            return request(await createApp('test_host'))
                .get('/abc.jpg')
                .set('Referer', 'http://example.com/review')
                .expect(401)
        })
        it('should return 200 when referred from /review and good bone', async () => {
            sandbox.stub(express, 'static').callsFake(() => (req, res) => res.send(200))
            return request(await createApp('test_host'))
                .get('/myNewDog.mp4')
                .set('Cookie', 'bone=' + Buffer.from('goodKey').toString('base64'))
                .set('Referer', 'http://example.com/review')
                .expect(200)
        })
        it('should return 200 when not referred from /review', async () => {
            sandbox.stub(express, 'static').callsFake(() => (req, res) => res.send(200))
            return request(await createApp('test_host'))
                .get('/myNewDog.mp4')
                .expect(200)
        })
    })
    describe('/review', () => {
        describe('unauthorized', () => {
            ['get', 'post'].forEach(method => {
                describe(method, () => {
                    it('should return 401 when bone cookie not present', async () => {
                        return request(await createApp('test_host'))[method]('/review')
                            .set('Cookie', 'treat=goodKey')
                            .expect(401)
                    })
                    it('should return 401 when bone cookie is badKey', async () => {
                        return request(await createApp('test_host'))[method]('/review')
                            .set('Cookie', 'bone=badKey')
                            .expect(401)
                    })
                    it('should return 401 when bone cookie is decoded goodKey', async () => {
                        return request(await createApp('test_host'))[method]('/review')
                            .set('Cookie', 'bone=' + 'goodKey')
                            .expect(401)
                    })
                })
            })
        })
        describe('authorized', () => {
            describe('get', () => {
                it('should return 200 when bone cookie is encoded goodKey', async () => {
                    return request(await createApp('test_host'))
                        .get('/review')
                        .set('Cookie', 'bone=' + Buffer.from('goodKey').toString('base64'))
                        .expect(200)
                })
            })
            describe('post', () => {
                it('should return 200 when bone cookie is encoded goodKey', async () => {
                    return request(await createApp('test_host'))
                        .post('/review')
                        .set('Cookie', 'bone=' + Buffer.from('goodKey').toString('base64'))
                        .send({action: 'adopt', dogName: 'cliff'})
                        .expect(200)
                })
            })
        })
    })
})
