const io = require("../../socket.io-client");
const Await = require("../../micro-service-modules-await");
const util = require("util");

let socket;
let connectAwait;
let Listener;

async function getSocket(host, port)
{
    if (typeof socket != 'undefined' && socket.connected)
        return socket;

    if (typeof connectAwait != 'undefined' && typeof connectAwait.active != 'undefined' && connectAwait.active)
        return await connectAwait.wait();

    socket = await io(host + (typeof port != 'undefined' ? ':' + port : '') + '/', {"reconnectionAttempts": 3});
    connectAwait = new Await(500, 20,  async (timer) => {

        if (typeof socket.connected != 'undefined' && socket.connected === true)
            timer.ready = true;
    });

    connectAwait.ready = false;

    return await connectAwait.wait();
}

class Requests
{
    constructor()
    {
        this.isInit = false;
        this.repeater = [];
        this.socket = socket;
    }

    async emitCircle(type, params, callback, to)
    {
        this.repeater.push([type, params, callback, to]);

        return await this.emit(type, params, callback, to)
    }

    async emitRepeater()
    {
        for (let _args of this.repeater)
            await this.emit.apply(this, _args);

        return true;
    }

    async emit(type, params, callback, to)
    {
        if (await this.init()) {

            let _await = new Await(100, 2);
                _await.ready = false;
            let _response = false;

            await socket.emit(
                this.instance,
                Object.assign(
                    {},
                    (params ?? {}),
                    {
                        "type" : type,
                        "from" : this.module.moduleName,
                        "to" : to
                    }
                ),
                async (response) => {

                    _response = response;
                    _await.ready = true;

                    if (util.isFunction(callback))
                        callback(_response);
                }
            );

            await _await.wait();

            return _response;
        }

        return false;
    }

    async init()
    {
        if (!await getSocket(this.module.host, this.module.port))
            return false;

        if (this.isInit)
            return true;

        await this.join({"module" : this.module.moduleName});

        await socket.on(this.instance, async (params) => {

            if (typeof params.type != 'undefined' && typeof params.event != 'undefined') {

                let _response = {"error" : true, "error_str" : "undefined handler"};

                    if (params.type === 'trigger' && typeof params.from != 'undefined')
                        _response = await this.getModule(params.from).trigger(params.event, params.params ?? {}, params.request_index ?? false);

                    if (params.type === 'await')
                        _response = await this.await(params.event, params.params ?? {}, params.request_index ?? false);

                return _response;
            }

            return false;
        });

        await socket.on("disconnect", async () => {
            this.isInit = await this.join({"module" : this.module.moduleName});
        });

        return this.isInit;
    }

    async join(group)
    {
        this.isInit = await socket.emit("join", group);
        await this.emitRepeater();

        return  this.isInit;
    }
}

module.exports = Requests;