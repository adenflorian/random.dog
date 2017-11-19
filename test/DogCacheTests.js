import {expect} from 'chai'
import sinon from 'sinon'
import {List} from 'immutable'
import {DogCache} from '../src/DogCache'
import * as utils from '../src/utils'

describe('DogCache', () => {
    it('should throw a TypeError when passed undefined', () => {
        expect(() => new DogCache(undefined)).to.throw(TypeError, /^dogs must be a List$/)
    })
    it('should throw an Error when passed empty List', () => {
        expect(() => new DogCache(new List())).to.throw(Error, /^dogs must have dogs in it$/)
    })
    it('should throw an Error when passed List of numbers', () => {
        expect(() => new DogCache(new List([1]))).to.throw(Error, /^only dog strings allowed$/)
    })
    it('should throw an Error when passed array of numbers and strings', () => {
        expect(() => new DogCache(new List(['1', 1, '1']))).to.throw(Error, /^only dog strings allowed$/)
    })
    describe('random', () => {
        afterEach(() => utils.randomInt.restore && utils.randomInt.restore())
        it('should return 1st dog when randomInt returns 0', () => {
            sinon.stub(utils, 'randomInt').returns(0)
            expect(new DogCache(new List(['dog1'])).random()).to.equal('dog1')
        })
        it('should return 2nd dog when randomInt returns 1', () => {
            sinon.stub(utils, 'randomInt').returns(1)
            expect(new DogCache(new List(['dog1', 'dog2'])).random()).to.equal('dog2')
        })
    })
})