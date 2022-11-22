const config = require("./config.json");
const util = require("util");

class Queue
{
    constructor(params)
    {
        this.subscribers = {};

        let _config = Object.assign(config, params ?? {});

        try {
            this.controller = new (require("./controllers/" + _config.controller + ".js"))(_config.client, _config.group, _config.host, _config.port);
        } catch (e) {
            console.log(e);
        }
    }

    async send(title, headers, message)
    {
        return await this.controller.send(title, headers, message);
    }

    async subscribe(title, progress, complete)
    {
        if (util.isFunction(progress) &&  await this.controller.subscribe(title, this.trigger.bind(this))) {

            if (typeof this.subscribers[title] == 'undefined')
                this.subscribers[title] = [];

            this.subscribers[title].push({"progress" : progress, "complete" : (util.isFunction(complete)) ? complete : progress});

            return true;
        }

        return false;
    }

    async trigger(type, title, headers, message)
    {
        if (typeof this.subscribers[title] != 'undefined') {

            for (let subscribe of this.subscribers[title]) {
                if (this._executeHandler(subscribe[type ?? "progress"], {"title" : title, "headers" : headers, "message" : message}) === false)
                    return false;
            }
        }

        return true;
    }

    async _executeHandler(handler, params)
    {
        if (handler.constructor.name === "AsyncFunction") {
            return await handler(params ?? {});
        } else {
            return handler(params ?? {});
        }

        return false;
    }
}

module.exports = Queue;