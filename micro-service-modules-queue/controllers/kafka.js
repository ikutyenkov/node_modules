const { Kafka } = require('../../kafkajs');
const config = require("../config.json");
const util = require("util");
const timerCallback = async function() {
    await this.self.subscribeCallback[this.topic]('complete', this.topic);
};

class Controller
{
    constructor(client, group, host, port)
    {
        this._client = client;
        this._group = group;
        this._host = host;
        this._port = port;

        this.initiate = false;
        this.producered = false;
        this.consumered = false;
        this.subscribeCallback = {};
        this.queueTimers = {};
    }

    async init()
    {

        if (this.initiate)
            return this.initiate;

        this.connection = new Kafka({
            "clientId": this._client,
            "brokers": [this._host + (typeof this._port != 'undefined' ? ':' + this._port : '')]
        });

        this.initiate = true;

        return this.initiate;
    }

    async initProducer()
    {
        if (this.producered)
            return this.producered;

        if (await this.init()) {

            this.producer = await this.connection.producer();
            await this.producer.connect();

            this.producered = true;

            return this.producered;
        }

        return false;
    }

    async subscribe(topic, callback)
    {
        if (util.isFunction(callback) && await this.initConsumer()) {

            if (typeof this.subscribeCallback[topic] != 'undefined')
                return true;

            this.subscribeCallback[topic] = callback;
            //this.consumer.stop();
            this.consumer.subscribe({"topic": topic, "fromBeginning": true});
            await this.consumer.run({eachMessage : this.eachMessage.bind(this)})

            return true;
        }

        return false;
    }

    async initConsumer()
    {
        if (this.consumered)
            return this.consumered;

        if (await this.init()) {

            this.consumer = await this.connection.consumer({"groupId": this._group});

                await this.consumer.connect();

            this.consumered = true;

            return this.consumered;
        }

        return false;
    }

    async eachMessage({ topic, partition, message })
    {
        let _message = (typeof message.value.toString != 'undefined' ? message.value.toString() : message.value);

            try {
                _message = JSON.parse(_message);
            } catch (e) {}

        let _headers = {};

            if (typeof message.headers == 'object' && message.headers) {

                for (let key in message.headers)
                    _headers[key] = (typeof message.headers[key].toString != 'undefined' ? message.headers[key].toString() : message.headers[key])
            }

        await this.subscribeCallback[topic]('progress', topic, _headers, _message);

        if (this.queueTimers[topic])
            clearTimeout(this.queueTimers[topic]);

        this.queueTimers[topic] = setTimeout(
            timerCallback.bind({
                "self" : this,
                "topic" : topic
            }),
            config.timeout * 1000
        );
    }

    async send(title, headers, message)
    {
        if (await this.initProducer()) {

            try {

                return await this.producer.send({
                    "topic": title,
                    "messages": [
                        {
                            "headers": headers ?? {},
                            "value": (typeof message == 'object' ? JSON.stringify(message) : message)
                        },
                    ],
                });
            } catch (e) {
                console.log(e);
            }
        }

        return false;
    }
}

module.exports = Controller;
