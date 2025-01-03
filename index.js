const mineflayer = require('mineflayer');
const readline = require('readline');
const config = require('./src/config');
const { getMicrosoftAuth } = require('./src/auth');
const CommandHandler = require('./src/commands');
const DiscordHandler = require('./src/discordHandler');

// Initialize Discord Handler
new DiscordHandler();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

let bots = [];
const activeUsers = new Set();
let activeBotIndex = 0; // Tracks the highest-priority bot

const initBot = async (args) => {
    try {
        const botOptions = {
            host: config.defaultServer.host,
            version: config.defaultServer.version,
            ...(args.auth === 'microsoft' ? { auth: 'microsoft', username: args.username } : { username: args.username }),
        };

        const bot = mineflayer.createBot(botOptions);
        const commandHandler = new CommandHandler(bot, activeUsers);
        bots.push(bot);

        bot.on('login', () => {
            const botSocket = bot._client.socket;
            console.log(`Logged in to ${botSocket.server ? botSocket.server : botSocket._host}`);
            if (args.auth === 'offline' && args.password) {
                bot.chat(`/login ${args.password}`);
            }
        });

        bot.on('spawn', () => {
            console.log(`${bot.username} spawned in`);
            bot.chat('/smp');
            setInterval(() => bot.chat('/smp'), 600000); // Periodic SMP chat every 10 minutes
        });

        bot.on('game', (oldGame, newGame) => {
            if (oldGame && newGame && oldGame.dimension !== newGame.dimension) {
                console.log(`Dimension changed from ${oldGame.dimension} to ${newGame.dimension}`);
                bot.chat('/smp');
            }
        });

        bot.on('message', (jsonMsg) => {
            const message = jsonMsg.toString();
            if (bots[activeBotIndex].username === bot.username) {
                console.log(`[ ${bot.username} ]`, message);
            }

            handleChatMessage(message, bot, commandHandler);
        });

        bot.on('error', (err) => {
            console.error(`${bot.username} encountered an error:`, err);
            if (err.code === 'ECONNREFUSED') {
                console.log(`Failed to connect to ${err.address}:${err.port}`);
            }
        });

        bot.on('end', (reason) => {
            console.log(`${bot.username} disconnected » ${reason}`);
            setTimeout(() => initBot(args), 10000);
        });

        rl.removeAllListeners('line'); // Ensure no duplicate listeners
        rl.on('line', (line) => {
            if (bot.entity) {
                bot.chat(line);
            } else {
                console.log(`${bot.username} is not ready yet.`);
            }
        });
    } catch (error) {
        console.error('Failed to initialize bot:', error);
        setTimeout(() => initBot(args), 10000);
    }
};

const handleChatMessage = (message, bot, commandHandler) => {
    const pbots = ['strange_exe', '_ABHAY_GAMING_', 'STRANGE', 'ThunderBlaze'];
    const match = message.match(/^\s*strange_exe\s*\(\d+\)\s*»\s+(.*)$/) || message.match(/^\[Discord \| [^\]]+\] (\w+) » (.*)$/);

    if (match) {
        const [username, chatMessage] = match.slice(1);
        console.log(`[CHAT] ${username} » ${chatMessage}`);

        if (chatMessage.startsWith('.')) {
            const [command, ...args] = chatMessage.slice(1).split(' ');
            processCommand(username, command, args, commandHandler, bot);
        }

        // Update active bot index based on current bot
        activeBotIndex = pbots.indexOf(bot.username);
    }
};

const processCommand = (username, command, args, commandHandler, bot) => {
    if (username.trim() !== 'strange_exe') {
        console.log(`Command from non-authorized user » ${username}`);
        return;
    }

    try {
        switch (command) {
            case 'copy':
                if (args.length > 0) {
                    const textToCopy = args.join(' ');
                    bot.chat(textToCopy);
                    console.log(`Copied and executed » ${textToCopy}`);
                } else {
                    console.log('Usage: .copy [text]');
                }
                break;
            case 'quit':
                if (args.length > 0) {
                    const botName = args[0];
                    const botToDisconnect = bots.find((b) => b.username === botName);
                    if (botToDisconnect) {
                        botToDisconnect.quit('Disconnected by command');
                        console.log(`Bot ${botName} has been disconnected.`);
                    } else {
                        console.log(`No bot found with the name ${botName}.`);
                    }
                } else {
                    console.log('Usage: .quit [botName]');
                }
                break;
            case 'join':
                if (args.length > 0) {
                    commandHandler.handleJoin(args[0]);
                } else {
                    console.log('Usage: .join [username]');
                }
                break;
            case 'gosmp':
                commandHandler.handleGoSMP();
                break;
            default:
                console.log(`Unknown command » ${command}`);
        }
    } catch (error) {
        console.error(`Error while processing command '${command}':`, error);
    }
};

const addMicrosoftBot = (email) => {
    const args = {
        username: email,
        auth: 'microsoft',
    };
    initBot(args);
};

config.offlineAccounts.forEach(initBot);

module.exports = { addMicrosoftBot };
