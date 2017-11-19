import {randomInt} from './utils'

export class DogCache {
    constructor(dogs) {
        if (Array.isArray(dogs) === false) throw new TypeError('dogs must be an array')
        if (dogs.length === 0) throw new Error('array must have dogs in it')
        if (dogs.every(dog => typeof dog === 'string') === false) throw new Error('array must have only dog strings in it')
        this.dogs = dogs
    }

    random = () => this.dogs[randomInt(this.dogs.length)]
}