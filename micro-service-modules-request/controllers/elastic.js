const Model = require("./model.js");
const md5 = require("../../node_modules/md5");
const util = require("util");
const { Client } = require('../../node_modules/@elastic/elasticsearch');

class Controller extends Model
{
    constructor(params)
    {
        super(params);

        this.elasticSearch = new Client({
            node : this._protocol + '://' + this._host + ':' + this._port
        });
    }

    async insert(params)
    {
        return await this.elasticSearch.bulk(params);
    }

    async fetch(result, processing)
    {
        let arr = {};

        if (typeof result.body == 'object' && typeof result.body.hits == 'object' && typeof result.body.hits.hits == 'object' && result.body.hits.hits) {

            for (let _key of Object.keys(result.body.hits.hits)) {

                let _id = (result.body.hits.hits[_key]['external_param_id'] ?? result.body.hits.hits[_key]['external_id']) ?? result.body.hits.hits[_key]['_id'];

                arr["_" + _id] = Object.assign(
                    {
                        "_score" : result.body.hits.hits[_key]['_score'],
                        "_sort" : (typeof result.body.hits.hits[_key]['sort'] != 'undefined' && typeof result.body.hits.hits[_key]['sort'][0] != 'undefined' ? result.body.hits.hits[_key]['sort'][0] : result.body.hits.hits[_key]['_score'])
                    },
                    result.body.hits.hits[_key]['_source']
                );

                if (util.isFunction(processing))
                    await processing(_id, arr["_" + _id]);
            }
        }

        return arr;
    }

    async getAutoIncrement(table)
    {
        if (typeof this.increments[table] != 'undefined')
            return this.increments[table];

        try {

            for (let item of Object.values(await this.fetch(await this.elasticSearch.search({
                "index": 'autoincrements',
                "body": {
                    "query" : {
                        "match" : {
                            "table" : table
                        }
                    },
                    "from": 0,
                    "size": 1
                }
            }))))
                return this.increments[table] = (item['increment'] - 0) + 1;

        } catch (e) {
            console.log(e);
        }

        return this.increments[table] = 1;
    }

    async addAutoIncrement(table)
    {
        let increment = (await this.getAutoIncrement(table) - 0) + 1;

        try {

            await this.elasticSearch.index({
                "index": 'autoincrements',
                "id": md5(table),
                "body": {
                    "table": table,
                    "increment": increment
                }
            });

            return this.increments[table] = increment;
        } catch (e) {
            console.log(e);
        }

        return this.increments[table] = false;
    }



    async issetOrCreateTable(table)
    {
        if (this.isCachedTable(table) && typeof this.tables[table]['exists'] != 'undefined') {
            return this.tables[table]['exists'];
        } else {
            this.tables[table] = {"exists" : false, "scheme" : false, "compare" : {}};
        }

        try {

            if ((await this.elasticSearch.indices.exists({"index": table}))['body'] !== true) {

                try {

                    await this.elasticSearch.indices.create({
                        "index" : table,
                        "body" :  {
                            "settings" : {
                                "analysis": {
                                    "filter": {
                                        "autocomplete_filter": {
                                            "type": "edge_ngram",
                                            "min_gram": 1,
                                            "max_gram": 10
                                        }
                                    },
                                    "analyzer": {
                                        "autocomplete": {
                                            "type": "custom",
                                            "tokenizer": "standard",
                                            "filter": [
                                                "lowercase",
                                                "autocomplete_filter"
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.log(e);
                    return this.tables[table]['exists'] = false;
                }
            }

            return this.tables[table]['exists'] = true;
        } catch (e) {
            console.log(e);
        }

        return this.tables[table]['exists'] = false;
    }

    async getMapping(table)
    {
        if (await this.issetOrCreateTable(table)) {

            if (this.isCachedTable(table) && this.tables[table]['scheme']) {
                return this.tables[table]['scheme'];
            } else {

                try {

                    let _mapping = await this.elasticSearch.indices.getMapping({"index": table});

                    return this.tables[table]['scheme'] = (typeof _mapping.body != 'undefined' && typeof _mapping.body[table] != 'undefined' && typeof _mapping.body[table].mappings.properties != 'undefined') ? _mapping.body[table].mappings : {};
                } catch (e) {
                    console.log(e);
                }
            }
        }

        return false;
    }

    async getClearMapping(table)
    {
        let _mapping = await this.getMapping(table);

        if (_mapping) {

            let _set = (clear, mapping) => {

                if (typeof mapping.properties != 'undefined') {

                    for (let _key in mapping.properties) {

                        if (typeof mapping.properties[_key].properties != 'undefined') {
                            clear[_key] = {};
                            _set(clear[_key], mapping.properties[_key]);
                        } else {
                            clear[_key] = mapping.properties[_key].type;
                        }
                    }
                }

                return clear;
            }

            return _set({}, _mapping);

        } else {
            return _mapping;
        }
    }

    async repairMapping(table, scheme)
    {
        let _compare = scheme;

        if (typeof scheme == 'object' && scheme) {

            _compare = md5(JSON.stringify(scheme) || {});

            if (this.isCachedTable(table) && typeof this.tables[table]['compare'][_compare] != 'undefined')
                return this.tables[table]['compare'][_compare];

            let _mapping = await this.getMapping(table);

            if (_mapping) {

                this.tables[table]['compare'][_compare] = (md5(JSON.stringify(this.tables[table]['scheme']) ?? {}) !== _compare);

                if (md5(JSON.stringify(this.tables[table]['scheme'])) !== _compare) {

                    try {

                        await this.elasticSearch.indices.putMapping({
                            "index": table,
                            "body": Object.assign(_mapping, scheme)
                        });

                        return this.tables[table]['compare'][_compare] = true;
                    } catch (e) {
                        console.log(e);
                    }
                } else {
                    return this.tables[table]['compare'][_compare] = true;
                }
            }
        }

        return this.tables[table]['compare'][_compare] = false;
    }
}

module.exports = Controller;