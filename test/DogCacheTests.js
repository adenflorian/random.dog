import {expect} from 'chai'
import sinon from 'sinon'
import {DogCache} from '../src/DogCache'
import * as utils from '../src/utils'

describe('DogCache', () => {
    it('should throw a TypeError when passed undefined', () => {
        expect(() => new DogCache(undefined)).to.throw(TypeError, /^dogs must be an array$/)
    })
    it('should throw an Error when passed empty array', () => {
        expect(() => new DogCache([])).to.throw(Error, /^array must have dogs in it$/)
    })
    it('should throw an Error when passed array of numbers', () => {
        expect(() => new DogCache([1])).to.throw(Error, /^array must have only dog strings in it$/)
    })
    it('should throw an Error when passed array of numbers and strings', () => {
        expect(() => new DogCache(['1', 1, '1'])).to.throw(Error, /^array must have only dog strings in it$/)
    })
    describe('random', () => {
        afterEach(() => utils.randomInt.restore && utils.randomInt.restore())
        it('should return 1st dog when randomInt returns 0', () => {
            sinon.stub(utils, 'randomInt').returns(0)
            expect(new DogCache(['dog1']).random()).to.equal('dog1')
        })
        it('should return 2nd dog when randomInt returns 1', () => {
            sinon.stub(utils, 'randomInt').returns(1)
            expect(new DogCache(['dog1', 'dog2']).random()).to.equal('dog2')
        })
    })
})