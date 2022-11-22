class Controller
{
    constructor(params)
    {
        this.tables = {};
        this.increments = {};
        this._protocol = params.protocol;
        this._host = params.host;
        this._port = params.port;
    }

    isCachedTable(table)
    {
        return (typeof this.tables[table] == 'object' && this.tables[table]);
    }
}

module.exports = Controller;