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

// Bot configuration
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

let retryAttempts = {}; // Track retries for each bot
const MAX_RETRIES = 5;  // Maximum number of reconnection attempts

// Function to initialize a bot
const initBot = (args) => {
    const bot = mineflayer.createBot(args);

    bot.on('login', () => {
        console.log(`${bot.username} logged in.`);
        bot.chat(`/login ${args.password}`);
        retryAttempts[args.username] = 0; // Reset retry attempts on successful login
    });

    bot.on('spawn', () => {
        console.log(`${bot.username} spawned in.`);
        bot.chat("/smp");
    });

    bot.on('chat', (username, message) => {
        const chatMessage = `${username}: ${message}`;
        logMessage(chatMessage);

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

        if (!retryAttempts[args.username]) retryAttempts[args.username] = 0;
        if (retryAttempts[args.username] < MAX_RETRIES) {
            const retryDelay = Math.pow(2, retryAttempts[args.username]) * 1000; // Exponential backoff
            console.log(`Retrying in ${retryDelay / 1000} seconds...`);
            retryAttempts[args.username]++;

            setTimeout(() => {
                console.log(`Reconnecting ${args.username}...`);
                initBot(args); // Reinitialize the bot
            }, retryDelay);
        } else {
            console.log(`Max retries reached for ${args.username}. Not reconnecting.`);
        }
    });

    bot.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
            console.error(`Failed to connect to ${err.address}:${err.port}`);
        } else {
            console.error(`Unhandled error for ${bot.username}:`, err);
        }
    });

    rl.on('line', (line) => {
        bot.chat(line); // Allow manual commands via console
    });
};

// Start all bots
const startBots = () => {
    BotArgs.forEach((args) => {
        retryAttempts[args.username] = 0; // Initialize retry counter
        initBot(args);
    });
};

// Start bots when the app runs
if (require.main === module) {
    startBots();
}
