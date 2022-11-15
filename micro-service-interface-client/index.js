const Instance = require("./controllers/instance.js");

class MicroServiceInterfaceClient
{
    constructor(host, module, port)
    {
        this.host = host;
        this.port = port;
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