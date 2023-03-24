const { Client } = require('@elastic/elasticsearch');
// import { Client } from '@elastic/elasticsearch';
const client = new Client({ node: 'http://172.26.115.197:9200' });
require('array.prototype.flatmap').shim()

class publishToElasticSearch {
    async makebulk(test_list) {
        /*
        const bulk = []
        let idx = 0;
        for (const current in test_list) {
            bulk.push(
                { index: { _index: 'adityas-index_name', _type: 'test_case', _id: idx++ } },
                {
                    // test_list[current];
                    URL: test_list[current].URL,
                    path: test_list[current].path,
                    query: test_list[current].query,
                    actual_output: test_list[current].actual_output,
                    expected_output: test_list[current].expected_output,
                    timestamp: test_list[current].timestamp,
                    TestStatus: test_list[current].TestStatus,
                    executionTimeStamp: test_list[current].executionTimeStamp
                }
            )
        }
        */
        console.log(`Send To ES=> request body length:${test_list.length}`)

        const operations = test_list.flatMap(doc => [{ index: { _index: 'adityas-index_name' } }, doc])
        const bulkResponse = await client.bulk({ refresh: true, operations })

        // return await client.bulk({
        //     index: 'adityas-index_name',
        //     type: 'test_case',
        //     body: bulk
        // })
    }
}
module.exports = new publishToElasticSearch()
