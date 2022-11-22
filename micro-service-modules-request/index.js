const config = require("./config.json");

class Request
{
    constructor(params)
    {
        this.subscribers = {};

        let _config = Object.assign(config, params ?? {});

        try {
            this.controller = new (require("./controllers/" + _config.controller + ".js"))(_config);
        } catch (e) {
            console.log(e);
        }
    }
}

module.exports = Request;