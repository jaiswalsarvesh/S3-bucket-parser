/// Import the necessary AWS SDK libraries
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
//import and configure dotenv
const dotenv = require('dotenv');
dotenv.config();
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
  // Create a new command to retrieve an object from the S3 bucket
  const command = new GetObjectCommand({
    Bucket: "trellix-realprotect-querylog-parsed",
    Key: "2023-02-24/json_backup_1677196801212",
  });
  // Send the command to the S3 client and retrieve the object's body
  const { Body } = await client.send(command);
  // Convert the body contents from a stream to a string and log the results
  const bodyContents = await streamToString(Body);
  console.log(bodyContents);
})();


