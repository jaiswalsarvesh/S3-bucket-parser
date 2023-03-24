const { Client } = require('@elastic/elasticsearch');
// import { Client } from '@elastic/elasticsearch';
const client = new Client({ node: 'http://172.26.115.197:9200' });
require('array.prototype.flatmap').shim()

class publishToElasticSearch {
    async makebulk(test_list) {
        console.log(`Send To ES=> request body length:${test_list.length}`)

        const operations = test_list.flatMap(doc => [{ index: { _index: 'adityas-index_name' } }, doc])
        return await client.bulk({ refresh: true, operations })
    }
}
module.exports = new publishToElasticSearch()
