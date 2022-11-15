const util = require("util");
const sleep = require('util').promisify(setTimeout);

class Module {

    constructor(step, circles, callback) {

        this.queue = {"last" : 0, "active" : 0};
        this.ready = true;
        this.active = false;
        this.circles = {};
        this.limit = (!isNaN((circles - 0)) && circles > 0) ? (circles - 0) : 1;
        this.step = (!isNaN((step - 0)) && step > 0) ? (step - 0) : 1000;
        this.callback = util.isFunction(callback) ? callback : false;
    }

    async wait(id)
    {
        this.active = true;

        if (typeof id == 'undefined') {

            id = this.queue.last++;
            this.circles[id] = 0;
        }

        if (!this.ready && this.circles[id] < this.limit) {

            if (this.callback)
                await this.callback(this);

            if (this.queue.active === id)
                this.circles[id]++;

            await sleep(this.step);
            return await this.wait(id);
        }

        this.queue.active++;
        this.active = false;

        return true;
    }
}

module.exports = Module;