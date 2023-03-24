//Import the necessary AWS SDK libraries and other modules to fetch data from S3 Bucket
const { S3Client, ListObjectsCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
//const processScan = require('./processscan.js');
//Base URL to fetch the query dump
const baseurl = 'https://realprotect.qa.trellix.com';
// Import and configure dotenv for environment variables to connect S3
const dotenv = require('dotenv');
dotenv.config();
//fs module in NODEJS for reading and writing files
const fs = require('fs');
// Create an asynchronous function to retrieve data from an S3 bucket
(async () => {
    // Retrieve the AWS region from the environment variables
    const region = "us-west-2";
    // Create an S3 client using the provided AWS credentials
    const client = new S3Client({
        region: process.env.REGION,
        credentials: {
            accessKeyId: process.env.ACCESS_KEY_ID,
            secretAccessKey: process.env.SECRET_ACCESS_KEY,
            sessionToken: process.env.SESSION_TOKEN
        }
    });
    // Define a function to convert a stream into a string
    const streamToString = (stream) => new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) =>
            chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    });
    // Create a new command to list all objects in the S3 bucket folder i.e all files of a given folder
    const listCommand = new ListObjectsCommand({
        Bucket: "trellix-realprotect-querylog-parsed",
        Prefix: "2023-02-24/"
    });
    // Send the command to the S3 client and retrieve the list of objects in the folder
    const listObjects = await client.send(listCommand);
    // Create an array to store the keys of each object in the folder
    const objectKeys = listObjects.Contents.map((object) => object.Key);
    // Iterate through each key in the array and retrieve the corresponding object
    for (let i = 0; i < objectKeys.length; i++) {
        const key = objectKeys[i];
        // Create a new command to retrieve the object from the S3 bucket
        const getCommand = new GetObjectCommand({
            Bucket: "trellix-realprotect-querylog-parsed",
            Key: key
        });
        // Send the command to the S3 client and retrieve the object's body
        const { Body } = await client.send(getCommand);
        // Convert the body contents from a stream to a string and log the results
        const bodyContents = await streamToString(Body);
        //console.log(`File ${i+1}: ${key}\nContents: ${bodyContents}\n`);
        const lines = bodyContents.split("\n");
        // Map each line to a JSON object and store in an array
        const inputquery = lines.map((line) => {
            try {
                return JSON.parse(line);
            } catch (error) {
                console.error(`Error parsing line: ${line}`);
                return null;
            }
        }).filter((inputquery) => inputquery !== null);
        //Log the resulting array of JSON objects
        //console.log(inputquery);


        async function makeRequest(inputquery) {
            //console.log("Making request to URL....Hang on");
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

        async function checkResponse() {
            //console.log("Requesting for Streams.");
            // Use the readStream function from the processScan module to read the input query stream.


            //processScan.readStream(key, async (inputquery) => {


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
                        executionTimeStamp: new Date()
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
                        executionTimeStamp: new Date()
                    });
                //Final Output of Responses in a desired format to be logged

            }
            console.log(finalOutput)
            const prettyOutput = JSON.stringify(finalOutput, null, 3);
            // Write the pretty-printed JSON string to a file
            fs.writeFile('output.json', prettyOutput, (err) => {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log('Output written to output.json');
            });
        }
        checkResponse();
    }
})();
