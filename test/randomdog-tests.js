import chai from 'chai'
chai.use(require('chai-string'))

import {expect} from 'chai'
import sinon from 'sinon'
import request from 'supertest'
import {createApp} from '../src/app'
import * as fsLayer from '../src/fs-layer'

sinon.stub(fsLayer, 'getGoodDogsSync').returns(['testdog.jpg'])

describe('randomdog', () => {
    describe('get /woof.json', () => {
        it('should go woof', () => {
            return request(createApp('testhost'))
                .get('/woof.json')
                .expect('Content-Type', /json/)
                .expect(200)
                .then(response => {
                    expect(response.body.url).to.equal('testhost/testdog.jpg')
                })
        })
    })
    describe('get /woof', () => {
        it('should go woof', () => {
            return request(createApp('testhost'))
                .get('/woof')
                .expect('Content-Type', /text\/html/)
                .expect(200)
                .then(response => {
                    expect(response.text).to.equal('testdog.jpg')
                })
        })
    })
})