const mineflayer = require('mineflayer');
const { Launcher } = require('minecraft-launcher-core');
const readline = require('readline');
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

// Function to obtain Microsoft authentication token
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
    if (args.auth === 'microsoft' && !args.token) {
        try {
            args.token = await getMicrosoftToken('your_email@domain.com', 'your_password');
        } catch (error) {
            console.error('Failed to get Microsoft authentication token:', error);
            return;
        }
    }

    let bot = mineflayer.createBot({
        host: args.host,
        version: args.version,
        username: args.username,  // Microsoft email
        auth: 'microsoft',        // Microsoft authentication
        token: args.token         // Microsoft token
    });

    bots.push(bot); // Add the bot to the list

    rl.on('line', line => bot.chat(line));

    bot.on('login', () => {
        let botSocket = bot._client.socket;
        console.log(`Logged in to ${botSocket.server ? botSocket.server : botSocket._host}`);
    });

    bot.on('end', (reason) => {
        console.log(`${bot.username} disconnected: ${reason}`);
        if (reason === 'socketClosed') {
            setTimeout(() => initBot(args), 10000);  // Retry connection
        }
    });

    bot.once('login', async () => {
        bot.chat(`/login ${args.password}`);  // Perform login if necessary
    });

    bot.on('spawn', async () => {
        console.log(`${bot.username} spawned in`);
        await bot.waitForTicks(60);  // Wait for the bot to fully load
        bot.chat("/smp");  // Join the gamemode after spawn
    });

    bot.on('chat', (username, message) => {
        if (username === "strange_exe" && message.startsWith('.copy ')) {
            let command = message.slice(6);  // Remove the ".copy " prefix
            bot.chat(command);  // Execute the command
        }

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
        console.log(`Error: ${err}`);
    });
};

// Initialize bots with their configurations
BotArgs.forEach(args => {
    initBot(args); // Initialize both offline and Microsoft bots
});
