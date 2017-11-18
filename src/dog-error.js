export class DogError extends Error {
    constructor(message, type) {
        super(message)
        this.dogErrorType = type
    }
}
