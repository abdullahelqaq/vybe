class Session {
    constructor(id, token) {
        this.sessionId = id;
        this.accessToken = token;
    }
}

module.exports = Session;