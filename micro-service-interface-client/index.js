const Instance = require("./controllers/instance.js");
const config = require("./config.json");

class MicroServiceInterfaceClient
{
    constructor(module, host, port)
    {
        this.host = host ?? config.host;
        this.port = port ?? config.port;
        this.moduleName = module;
        this.instances = {};
        this.initiate = false;
    }

    getInstance(instance)
    {
        if (typeof instance == 'undefined')
            instance = 'main';

        if (typeof this.instances[instance] == 'undefined')
            this.instances[instance] = new Instance(this, instance);

        return this.instances[instance];
    }
}

module.exports = MicroServiceInterfaceClient;