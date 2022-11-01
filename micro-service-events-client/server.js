const config = require("./config.json");

class Request
{
    constructor()
    {
    }

    subscribe(module, events, callback) {

    }

    trigger(module, event, params)
    {

    }

    async await(toModule, event, params, callback)
    {

    }
}

try {
    module.exports = require("../../EventManager/app.js");
} catch (e) {
    module.exports = Request;
}