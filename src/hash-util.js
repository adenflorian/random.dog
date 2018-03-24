import fs from 'fs-extra'
import bcrypt from 'bcryptjs'

let secret

export function checkHash(password) {
    if (!secret) secret = JSON.parse(fs.readFileSync('./secret.json', 'utf8')).secret
    return bcrypt.compareSync(password, secret)
}
