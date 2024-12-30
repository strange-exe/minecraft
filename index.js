const mineflayer = require('mineflayer');
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
        username: 'MicrosoftBot', // Microsoft account
        auth: 'microsoft'         // Specify Microsoft authentication
    }
];

let bots = []; // Array to store all bot instances

// Initialize bot with Microsoft authentication
const initBot = (args) => {
    let bot = mineflayer.createBot(args);

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
        if (message.startsWith('.gosmp ')) {
            bot.chat('/smp');
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
