import path from 'path'
import {List} from 'immutable'
import {randomInt} from './utils'
import {DogError} from './dog-error'

export class DogCache extends List {
    constructor(dogs) {
        if (List.isList(dogs) === false) throw new TypeError('dogs must be a List')
        if (dogs.count() === 0) throw new Error('dogs must have dogs in it')
        if (dogs.every(dog => typeof dog === 'string') === false) throw new Error('only dog strings allowed')
        super(dogs)
    }

    random = () => this.get(randomInt(this.count()))

    applyFilters = (filters) => {
        const filteredDogs = this.filter(dog => filters.includes(path.extname(dog).substring(1)) === false)
        if (filteredDogs.count() === 0) throw new DogError('No dogs left after applying filter :(', 400)
        return new DogCache(filteredDogs)
    }
}   