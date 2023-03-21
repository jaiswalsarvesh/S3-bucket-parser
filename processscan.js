// Require essential modules
const fs = require('fs');
const readline = require('readline');
// Class wrapping the readstream function
class ProcessScan {
  /**
   * Reads a file line by line and executes a callback function
   * @param {string} fileName - The name of the file to read
   * @param {function} callback - The function to execute after reading the file
   */
  readStream(fileName, callback) {
    // To store each query
    const queryArray = [];
    // Create a readline interface
    const readlineInterface = readline.createInterface({
      input: fs.createReadStream(fileName), // Use the fs module to create a read stream
      crlfDelay: Infinity // To handle any type of newline character
    });
    // Push each query into the queryArray
    readlineInterface.on('line', (line) => {
      queryArray.push(JSON.parse(line));
    });
    // Execute the callback function when the readline interface is closed
    readlineInterface.on('close', () => {
      console.log("Alert: Stream completed");
      callback(queryArray);
    });
    // Handle any errors that may occur
    readlineInterface.on('error', (err) => {
      console.error(`Error reading file: ${err}`);
    });
  }
}
// Export an instance of the ProcessScan class
module.exports = new ProcessScan();



























