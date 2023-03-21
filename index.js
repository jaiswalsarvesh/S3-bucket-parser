// Importing the processScan module to read the input query stream.
const processScan = require('./processscan.js');
// The base URL for the API calls.
const baseurl = 'https://realprotect.qa.trellix.com';
/**
 * Async function to make a request to the API for each input query and return an array of actual responses.
 * @param {Array} inputquery - An array of input queries.
 * @returns {Array} - An array of actual responses.
 */
async function makeRequest(inputquery) {
    console.log("Making request to URL....Hang on");
    // An array to store the actual responses for each query.
    let actualresponse = [];
    // Iterate through each query.
    for (let i = 0; i < inputquery.length; i++) {
        // Destructure each query to get the path, query, expected, and timestamp.
        const { path, query, expected, timestamp } = inputquery[i];    
        // Construct the full URL for the API call.
        const url = `${baseurl}${path}`;
        // Make the API call and wait for the response.
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(query),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        // Store the response as a JSON object.
        const individualresponse = await response.json();
        // Push the individual response for each query into the actual response array.
        actualresponse.push(individualresponse)
    }
    // Return the array of actual responses.
    return actualresponse;
}
/**
 * Function to check the response of each query against the expected output.
 * Reads the input query stream and calls the makeRequest function to get the actual responses.
 * Outputs a final report of the test status for each query.
 */
function checkResponse() {
    console.log("Requesting for Streams.");
    // Use the readStream function from the processScan module to read the input query stream.
    processScan.readStream('json_backup_1677196801212', async (inputquery) => {
        // An array to store the final output for each query.
        let finalOutput = [];
        // Call the makeRequest function to get the actual responses for each query.
        const responses = await makeRequest(inputquery);
        // Iterate through each query and compare the actual response to the expected response.
        for (let i = 0; i < inputquery.length; i++) {
            if (JSON.stringify(responses[i]) !== JSON.stringify(inputquery[i].expected))
                finalOutput.push({
                    URL: baseurl,
                    path: inputquery[i].path,
                    query: inputquery[i].query,
                    actual_output: responses[i],
                    expected_output: inputquery[i].expected,
                    timestamp: inputquery[i].timestamp,
                    TestStatus: 'Fail',
                    executionTimeStamp:new Date()
                });
            else
                finalOutput.push({
                    URL: baseurl,
                    path: inputquery[i].path,
                    query: inputquery[i].query,
                    actual_output: responses[i],
                    expected_output: inputquery[i].expected,
                    timestamp: inputquery[i].timestamp,
                    TestStatus: 'Pass',
                    executionTimeStamp:new Date()
                });
            //Final Output of Responses in a desired format to be logged
            console.log(finalOutput)
        }
    })
}
checkResponse();