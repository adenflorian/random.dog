export class BadDogRequest extends Error {
    constructor(message, type) {
        super(message)
        this.statusCode = type
    }
}
