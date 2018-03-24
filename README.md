# random.dog

The nodejs code behind [random.dog](https://random.dog)

## Setup

- `git clone`
- `npm install`
- `npm start`
- <http://localhost:8080/>

## Security Setup

- `/review` requires a cookie named `bone`
  - The value should be some base64 encoded text that, when hashed with bcrypt, matches the hash stored in a file named `secret.json` located in the project root folder
  - The json in `secret.json` should be like this:
    -  `{"secret": "<put hash here>"}`
  - Use [bcrypt-cli](https://www.npmjs.com/package/bcrypt-cli) to hash the password to store in the `secret.json`
  - Example cookie header:
    - `Cookie: cGFzc3dvcmQ=`

## API

On the `GET /woof`, `GET /woof.json`, and `GET /doggos` endpoints, you may add a query parameter called `filter` which should have 1 or more file extensions, separated by commas. When hitting any of the above 3 endpoints with the `filter` param, that endpoint will only return dogs that do not have one of the filtered extensions.

Example: `GET random.dog/woof?filter=mp4,webm` will only return dogs that do not have an extension of `mp4` or `webm`.
