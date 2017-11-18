import fs from 'fs-extra'
import bcrypt from 'bcrypt'

const secret = JSON.parse(fs.readFileSync('./secret.json', 'utf8')).secret

export function checkHash(password) {
    return bcrypt.compareSync(password, secret)
}