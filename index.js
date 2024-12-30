const mineflayer = require('mineflayer');
const readline = require('readline');
const { Launcher } = require('minecraft-launcher-core');  // Import the launcher-core for authentication
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let BotArgs = [
    {
        host: 'mc.leftypvp.net',
        version: '1.8.9',
        username: 'STRANGE', // Offline account
        password: 'strange.exe'    // Password for offline account
    },
    {
        host: 'mc.leftypvp.net',
        version: '1.8.9',
        username: 'strange_exe', // Microsoft account
        auth: 'microsoft',       // Specify Microsoft authentication
        token: null              // Placeholder for the Microsoft token
    }
];

let bots = []; // Array to store all bot instances

// Function to obtain Microsoft authentication token using launcher-core
const getMicrosoftToken = (username, password) => {
    return new Promise((resolve, reject) => {
        const launcher = new Launcher({
            clientPackage: {
                url: 'https://launchermeta.mojang.com/mc/game/version_manifest.json'
            },
            authentication: {
                username: username,
                password: password
            },
            directories: {
                game: './game',
                launcher: './launcher'
            }
        });

        launcher.authPlugin.on('authorization', (token) => {
            resolve(token);  // Resolve with the token
        });

        launcher.authPlugin.on('error', (err) => {
            reject(err); // Reject on error
        });

        launcher.start(); // Start the authentication process
    });
};

// Initialize bot with Microsoft authentication and token
const initBot = async (args) => {
    // If authentication is Microsoft, get the token
    if (args.auth === 'microsoft' && !args.token) {
        try {
            // Replace with the actual username and password for Microsoft account
            args.token = await getMicrosoftToken('social.abhinesh@outlook.com', 'strange.minecraft');
        } catch (error) {
            console.error('Failed to get Microsoft authentication token:', error);
            return;
        }
    }

    let bot = mineflayer.createBot({
        host: args.host,
        version: args.version,
        username: args.username,
        auth: 'microsoft',  // Use Microsoft auth
        token: args.token    // Pass the token
    });

    bots.push(bot); // Add the bot to the list

    rl.on('line', line => bot.chat(line));

    bot.on('login', () => {
        let botSocket = bot._client.socket;
        console.log(`Logged in to ${botSocket.server ? botSocket.server : botSocket._host}`);
    });

    bot.on('end', (reason) => {
        console.log(`${bot.username} disconnected: ${reason}`);

        // Attempt to reconnect after 10 seconds
        setTimeout(() => initBot(args), 10000);
    });

    bot.once('login', async () => {
        const password = args.password;
        bot.chat(`/login ${password}`);
    });

    bot.on('spawn', async () => {
        console.log(`${bot.username} spawned in`);
        await bot.waitForTicks(60);
        bot.chat("/smp");
    });

    bot.on('chat', (username, message) => {
        // If a message is received from "strange_exe" with .copy <message>, execute the message
        if (username === "strange_exe" && message.startsWith('.copy ')) {
            let command = message.slice(6); // Remove the ".copy " prefix
            bot.chat(command); // Execute the command
        }

        // Handle .quit command to disconnect a specific bot
        if (username === "strange_exe" && message.startsWith('.quit ')) {
            let botName = message.split(' ')[1];
            let botToDisconnect = bots.find(b => b.username === botName);
            if (botToDisconnect) {
                botToDisconnect.quit('Disconnected by command');
                console.log(`Bot ${botName} has been disconnected.`);
            }
        }
    });

    bot.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
            console.log(`Failed to connect to ${err.address}:${err.port}`);
        } else {
            console.log(`Unhandled error: ${err}`);
        }
    });
};

// Initialize bots with their configurations
BotArgs.forEach(args => {
    initBot(args); // Initialize both offline and Microsoft bots
});
