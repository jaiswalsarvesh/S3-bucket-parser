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


    function getclassfierName(response) {
        if (!response || !response.C) return "Invalid Response"
        if (response.C.includes("Real Protect-SS!")) return "CSSVM"
        else if (response.C.includes("Real Protect-EC!")) return "ESVM"
        else if (response.C.includes("Real Protect-HC!")) return "HC"
        else if (response.C.includes("Real Protect-SC!")) return "Third_Classifier"
        else if (response.C.includes("Real Protect-PENG4!")) return "PENG4"
        else if (response.C.includes("Real Protect-PSNGCFR!")) return "PSNGCFR"
        else if (response.C.includes("Real Protect-EC!")) return "EC"
        else if (response.C.includes("Real Protect-peft7!")) return "peft7"
        else if (response.C.includes("Real Protect-PEFT!")) return "PEFT"
        else if (response.C.includes("Real Protect-PEBN!")) return "PEBN"
        else if (response.C.includes("Real Protect-PSCR!")) return "PSCR"
        else if (response.C.includes("Real Protect-PSCFR!")) return "PSCFR"
        else if (response.C.includes("Real Protect-ac!")) return "ac"
        else if (response.C.includes("Real Protect-Gamarue.a!")) return "Gamarue"
        else if (response.C.includes("Real Protect-pegap!")) return "pegap"
        else if (response.C.includes("Real Protect-PENGSD5!")) return "PENGSD5"
        else if (response.C.includes("Real Protect.")) return "Heuristic"
        else return "Others"
    }

    async function callWebserver(item, fileNo, c) {
        // for (const item of inputquery) {
        // const { path, query, expected, timestamp } = inputquery[i];
        const { path, query, expected, timestamp } = item
        // Construct the full URL for the API call.
        const url = `${baseurl}${path}`
        console.log(`Request to webserver fileNo:${fileNo}, request No:${c}, API:${url}`)

        //  let response = [];
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
                console.log(`Response from webserver fileNo:${fileNo}, request No:${c}, mcafeeResp:`, expected, `trellixResp:`, jsondata)
                let sourceClassifier = getclassfierName(expected)
                let destinationClassifier = getclassfierName(jsondata)
                let output = {
                    URL: baseurl,
                    path,
                    query,
                    mcafeeResponse: expected,
                    trellixResponse: jsondata,
                    timestamp,
                    classificationMcafee: sourceClassifier,
                    classificationTrellix: destinationClassifier,
                    isSameClassifier: (sourceClassifier === destinationClassifier) && (sourceClassifier != "Others") ? true : false,
                    executionTimeStamp: new Date()
                }
                if (JSON.stringify(expected) == JSON.stringify(jsondata)) {
                    output.testStatus = 'Pass'
                }
                else output.testStatus = 'Fail'

                return new Promise(resolve => resolve(output))
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
        // Call the makeRequest function to get the actual responses for each query.
        const finalOutput = await makeRequest(inputquery, fileNumber)

        // Iterate through each query and compare the actual response to the expected response.

        return await publishToElasticSearch.makebulk(finalOutput, listCommand.input.Prefix)
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
        Prefix: "2023-03-28"
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