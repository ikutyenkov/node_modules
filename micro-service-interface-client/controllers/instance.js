const Server = require("../handlers/server.js");
const Module = require("./module.js");
const util = require("util");

class Instance extends Server
{
    constructor(module, instance)
    {
        super();

        this.module = module;
        this.instance = instance;
        this.awaitTriggers = {};
    }

    getModule(name)
    {
        return (new Module(name)).setInstance(this);
    }

    async trigger(event, params)
    {
        return this.emit('trigger', {"event" : event, "params" : params});
    }

    awaitSubscribe(event, callback)
    {
        if (util.isFunction(callback)) {

            this.awaitTriggers[event] = callback;
            this.emitCircle('awaitSubscribe', {"event" : event});

            return true;
        }

        return false;
    }

    async await(event, params, request_index)
    {
        if (typeof this.awaitTriggers[event] != 'undefined') {

            let _response = {"error" : false};

                if (this.awaitTriggers[event].constructor.name === "AsyncFunction") {
                    _response = await this.awaitTriggers[event](params ?? {});
                } else {
                    _response = this.awaitTriggers[event](params ?? {});
                }

            return this.emit('awaitResponse', {"event" : event, "request_index" : request_index, "response" : _response});
        }

        return false;
    }
}

module.exports = Instance;