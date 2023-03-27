//Import the necessary AWS SDK libraries and other modules to fetch data from S3 Bucket
const { S3Client, ListObjectsCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const baseurl = 'https://realprotect.qa.trellix.com';

// Import and configure dotenv for environment variables to connect S3
require('dotenv').config()
const fetch = require('node-fetch')
//fs module in NODEJS for reading and writing files
const fs = require('fs')

const publishToElasticSearch = require("./es")

// Create an asynchronous function to retrieve data from an S3 bucket
async function run() {
    async function callWebserver(item, fileNo, c) {
        // for (const item of inputquery) {
        // const { path, query, expected, timestamp } = inputquery[i];
        const { path, query, expected, timestamp } = item
        // Construct the full URL for the API call.
        const url = `${baseurl}${path}`
        console.log(`Request to webserver fileNo:${fileNo}, request No:${c}, API:${url}`)

        // Make the API call and wait for the response.
        return await fetch(url, {
            method: 'POST',
            body: JSON.stringify(query),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then((jsondata) => {
                console.log(`Response from webserver fileNo:${fileNo}, request No:${c}, resp:`, jsondata)
                return new Promise(resolve => resolve(jsondata))
            }).catch(e => new Promise((resolve, reject) => {
                console.error(`Error response from webserver fileNo:${fileNo}, request No:${c}, error:${e}`)
                reject(e)
            }))
    }

    async function makeRequest(inputquery, fileNo) {
        //console.log("Making request to URL....Hang on");
        // An array to store the actual responses for each query.
        let counter = 0
        return new Promise((resolve, reject) => {
            return Promise.allSettled(inputquery.map(async item => {
                return await callWebserver(item, fileNo, counter++)
            })).then(resp => {
                console.log(`DONE fileNo:${fileNo}`)

                resolve(resp)
            }).catch(e => {
                console.log(`FAILED fileNo:${fileNo}`)
                reject(e)
            })
        })
    }

    async function checkResponse(inputquery, fileNumber) {
        let finalOutput = [];
        // Call the makeRequest function to get the actual responses for each query.
        const responses = await makeRequest(inputquery, fileNumber)

        // Iterate through each query and compare the actual response to the expected response.
        for (let i = 0; i < inputquery.length; i++) {
            if (JSON.stringify(responses[i]) !== JSON.stringify(inputquery[i].expected)) {
                finalOutput.push({
                    URL: baseurl,
                    path: inputquery[i].path,
                    query: inputquery[i].query,
                    actual_output: responses[i],
                    expected_output: inputquery[i].expected,
                    timestamp: inputquery[i].timestamp,
                    TestStatus: 'Fail',
                    executionTimeStamp: new Date()
                })
            } else {
                finalOutput.push({
                    URL: baseurl,
                    path: inputquery[i].path,
                    query: inputquery[i].query,
                    actual_output: responses[i],
                    expected_output: inputquery[i].expected,
                    timestamp: inputquery[i].timestamp,
                    TestStatus: 'Pass',
                    executionTimeStamp: new Date()
                })
            }
        }
        return await publishToElasticSearch.makebulk(finalOutput)
    }

    // Define a function to convert a stream into a string
    const streamToString = (stream) => new Promise((resolve, reject) => {
        const chunks = []
        stream.on("data", (chunk) => chunks.push(chunk))
        stream.on("error", reject)
        stream.on("end", () => {
            console.log("Current stream finished")
            resolve(Buffer.concat(chunks).toString("utf8"))
        })
    })

    //AWS CLIENT
    const client = new S3Client({
        region: process.env.REGION,
        credentials: {
            accessKeyId: process.env.ACCESS_KEY_ID,
            secretAccessKey: process.env.SECRET_ACCESS_KEY,
            sessionToken: process.env.SESSION_TOKEN
        }
    })

    // Create a new command to list all objects in the S3 bucket folder i.e all files of a given folder
    const listCommand = new ListObjectsCommand({
        Bucket: "trellix-realprotect-querylog-parsed",
        Prefix: "2023-02-24/"
    })

    // Send the command to the S3 client and retrieve the list of objects in the folder
    console.log(`Getting files from  bucket [trellix-realprotect-querylog-parsed]`)
    const listObjects = await client.send(listCommand)
    // Create an array to store the keys of each object in the folder
    // Iterate through each key in the array and retrieve the corresponding object
    const objectKeys = listObjects.Contents.map(object => object.Key)
    console.log("Total S3 files: ", objectKeys.length)
    let fileNo = 0

    // for (let i = 0; i < 2; i++) {
    for (let s3File of objectKeys) {
        // Create a new command to retrieve the object from the S3 bucket
        const getCommand = new GetObjectCommand({
            Bucket: "trellix-realprotect-querylog-parsed",
            Key: s3File
        })
        fileNo++ //counter file sequence
        console.log(`START process S3 dump's file:${s3File}, fileNo:${fileNo}`)

        // Send the command to the S3 client and retrieve the object's body
        const { Body } = await client.send(getCommand).catch(e => {
            console.error(`Failed while get stream for file:${s3File}, fileNo:${fileNo++}, err:${e}`)
            return
        })
        // Convert the body contents from a stream to a string and log the results
        const bodyContents = await streamToString(Body)
        const lines = bodyContents.split("\n")

        // Map each line to a JSON object and store in an array
        const inputquery = lines.map((line) => {
            try {
                return JSON.parse(line);
            } catch (error) {
                console.error(`Error parsing line: ${line}`);
                return null;
            }
        }).filter((inputquery) => inputquery !== null)

        let esResponse = await checkResponse(inputquery, fileNo).catch(e => {
            console.log(`Failed@webserver`, e)
        })
        if (esResponse) console.log(`----------Finish for s3 fileName:${s3File}, fileNo:${fileNo}--------\n\n`)
    }
}

//EXECUTE
run()