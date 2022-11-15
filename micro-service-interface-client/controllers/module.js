const Await = require("../../micro-service-modules-await");

class Module
{
    constructor(module) {
        this.module = module;
    }

    setInstance(instance)
    {
        this.instance = instance;
        this.subscribes = {};

        return this;
    }

    async await(event, params)
    {
        let _response = false;
        let _await = new Await(500, 20);
        _await.ready = false;

        await this.instance.emit('await', {"event" : event, "params" : params}, (response) => {
            _await.ready = true;
            _response = response;
        }, this.module);

        await _await.wait();

        return _response;
    }

    async subscribe(event, callback)
    {
        if (typeof this.subscribes[event] == 'undefined')
            this.subscribes[event] = [];

        this.subscribes[event].push(callback);

        if (await this.instance.emitCircle('subscribe', {"event" : event}, undefined, this.module)) {
            this.subscribes[event].push(callback);
            return true;
        }

        return false;
    }

    async trigger(event, params)
    {
        console.log(['trigg trigger', event, params]);
    }
}

module.exports = Module;