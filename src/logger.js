const fs = require('fs');

function logMessage(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync('chat_log.txt', `[${timestamp}] ${message}\n`);
    console.log(message);
}

module.exports = { logMessage };