const server = require("./server.js");

class MicroServiceEventsClient extends server
{
    constructor(module)
    {
        super();
        this.module = module;
    }

    trigger(event, params)
    {
        super.trigger(this.module, event, params);
    }
}

module.exports = MicroServiceEventsClient;