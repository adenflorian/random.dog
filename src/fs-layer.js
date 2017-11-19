import fs from 'fs-extra'
import {DogError} from './dog-error'

export const dogFolderName = {
    new: 'newdoggos',
    approved: 'img',
    reject: 'rejects',
}

fs.ensureDirSync(dogFolderName.new)
fs.ensureDirSync(dogFolderName.approved)
fs.ensureDirSync(dogFolderName.reject)

export function getDoggoCount() {
    return fs.readdir(dogFolderName.approved)
        .then(({length}) => length)
        .catch(console.err)
}

export const getNewDogs = () => fs.readdir(dogFolderName.new + '/')
export const getGoodDogs = () => fs.readdir(dogFolderName.approved + '/')

export async function rejectDog(dogName) {
    const rejectDogPath = `./${dogFolderName.new}/${dogName}`
    
    if (await fs.exists(rejectDogPath) === false) throw new DogError('dogName no exist', 400)

    await fs.move(rejectDogPath, `./${dogFolderName.reject}/${dogName}`, {overwrite: true})
}

export async function adoptDog(dogName) {
    const rejectDogPath = `./${dogFolderName.new}/${dogName}`
    
    if (await fs.exists(rejectDogPath) === false) throw new DogError('dogName no exist', 400)

    await fs.move(rejectDogPath, `./${dogFolderName.approved}/${dogName}`, {overwrite: true})
}