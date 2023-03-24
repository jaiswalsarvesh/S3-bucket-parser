const finalOutput = require('./index.js');
const { Client } = require('@elastic/elasticsearch');
// import { Client } from '@elastic/elasticsearch';
const client = new Client({ node: 'http://172.26.115.197:9200' });
// const fetch = require("node-fetch");
const input_file = finalOutput;
const bulk = [];

class publishToElasticSearch {



    makebulk(test_list, callback) {
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
            );
        }
        client.bulk({
            index: 'adityas-index_name',
            type: 'test_case',
            body: bulk
        }, function (err, resp, status) {
            if (err) {
                console.log(err);
            } else {
                callback(resp.items);
            }
        });
    };

}
module.exports = new publishToElasticSearch()
