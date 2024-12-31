const mineflayer = require('mineflayer');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to log messages to a file
const logMessage = (message) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync('chat_log.txt', `[${timestamp}] ${message}\n`);
    console.log(message);
};

// Function to initialize a bot
const initBot = (args) => {
    const bot = mineflayer.createBot(args);

    bot.on('login', () => {
        console.log(`${bot.username} logged in.`);
        bot.chat(`/login ${args.password}`);
    });

    bot.on('spawn', () => {
        console.log(`${bot.username} spawned in.`);
        bot.chat("/smp");
    });

    bot.on('chat', (username, message) => {
        const chatMessage = `${username}: ${message}`;
        logMessage(chatMessage);

        // Commands handling
        if (username === "strange_exe") {
            if (message.startsWith('.copy ')) {
                const command = message.slice(6);
                bot.chat(command);
            }

            if (message.startsWith('.quit ')) {
                const botName = message.split(' ')[1];
                if (bot.username === botName) {
                    bot.quit('Disconnected by command');
                    console.log(`Bot ${botName} has been disconnected.`);
                }
            }
        }

        if (message.startsWith('.gosmp')) {
            bot.chat('/smp');
        }
    });

    bot.on('end', (reason) => {
        console.log(`${bot.username} disconnected: ${reason}`);
        setTimeout(() => initBot(args), 10000); // Reconnect after 10 seconds
    });

    bot.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
            console.error(`Failed to connect to ${err.address}:${err.port}`);
        } else {
            console.error(`Unhandled error: ${err}`);
        }
    });

    rl.on('line', (line) => {
        bot.chat(line); // Allow manual commands via console
    });
};

// Function to start all bots
const startBots = () => {
    const BotArgs = [
        {
            host: 'mc.leftypvp.net',
            version: '1.8.9',
            username: 'STRANGE',
            password: 'strange.exe'
        },
        {
            host: 'mc.leftypvp.net',
            version: '1.8.9',
            username: '_ABHAY_GAMING_',
            password: 'abhaygaming'
        }
    ];

    BotArgs.forEach(initBot);
};

// Start bots when the app runs
if (require.main === module) {
    startBots();
}
