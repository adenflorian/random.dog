# random.dog

The nodejs code behind [random.dog](https://random.dog)

## Setup

- `git clone`
- `npm install`
- `npm start`
- <http://localhost:8080/>

## Security Setup

- `/review` requires a query param named `bone` with a correct value
  - The value should be some text that, when hashed with bcrypt, matches the hash stored in a file named `secret.json` located in the project root folder
  - The json in `secret.json` should be like this:
    -  `{"secret": "<put hash here>"}`
  -  I think I used [bcrypt-cli](https://www.npmjs.com/package/bcrypt-cli) to hash my password
  - Example URL:
    - `random.dog/review?bone=password`

I did the simplest thing I could think of from an implementation and user perspective.

From what I've read, worst case with putting a secret in query params when it's https, is that it gets stored as plain text in server logs, so as long as you never give anyone else access to my server it should be fine.

If anyone knows a better way to this though, please create an issue or PR! ☺
