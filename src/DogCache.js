import path from 'path'
import {List} from 'immutable'
import {randomInt} from './utils'
import {BadDogRequest} from './dog-error'

export class DogCache extends List {
    constructor(dogs) {
        if (List.isList(dogs) === false) throw new TypeError('dogs must be a List')
        if (dogs.count() === 0) throw new Error('dogs must have dogs in it')
        if (dogs.every(dog => typeof dog === 'string') === false) throw new Error('only dog strings allowed')
        super(dogs)
    }

    random = () => this.get(randomInt(this.count()))

    applyFilters = (filters) => {
        filters = filters.map(filter => filter.toLowerCase())
        const filteredDogs = this.filter(dog => {
            const ext = path.extname(dog).toLowerCase().substring(1)
            return filters.includes(ext) === false
        })
        if (filteredDogs.count() === 0) throw new BadDogRequest('No dogs left after applying filter :(', 400)
        return new DogCache(filteredDogs)
    }
}   
