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

        // Initialize Keep-Alive Mechanism
        initKeepAlive(bot);

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

const initKeepAlive = (bot) => {
    const interval = 5 * 60 * 1000; // 5 minutes

    const keepAlive = () => {
        if (!bot || !bot.player) return; // Ensure bot is connected
        console.log(`[Keep-Alive] Sending keep-alive command for ${bot.username}`);
        bot.chat('/ping'); // Replace '/ping' with a harmless command if needed
    };

    // Start the keep-alive mechanism
    const keepAliveInterval = setInterval(keepAlive, interval);

    // Clear the interval on bot disconnect
    bot.on('end', () => {
        console.log(`[Keep-Alive] Stopping keep-alive for ${bot.username}`);
        clearInterval(keepAliveInterval);
    });

    bot.on('error', (err) => {
        console.error(`[Keep-Alive] Error detected for ${bot.username}:`, err);
        clearInterval(keepAliveInterval);
    });
};

const handleChatMessage = (message, bot, commandHandler) => {
    const pbots = ['strange_exe', '_ABHAY_GAMING_', 'STRANGE', 'ThunderBlaze'];
    const match = message.match(/^\s*(?<username>\w+)\s*\(\d+\)\s*»\s+(?<chatMessage>.*)$/);
    if (match) {
        const { username, chatMessage } = match.groups;
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

    const commandMap = {
        copy: () => {
            if (args.length > 0) {
                const textToCopy = args.join(' ');
                bot.chat(textToCopy);
                console.log(`Copied and executed » ${textToCopy}`);
            } else {
                console.log('Usage: .copy [text]');
            }
        },
        quit: () => {
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
        },
        join: () => {
            if (args.length > 0) {
                commandHandler.handleJoin(args[0]);
            } else {
                console.log('Usage: .join [username]');
            }
        },
        gosmp: () => {
            commandHandler.handleGoSMP();
        },
    };

    if (commandMap[command]) {
        commandMap[command]();
    } else {
        console.log(`Unknown command » ${command}`);
    }
};

const addMicrosoftBot = (email) => {
    const args = {
        username: email,
        auth: 'microsoft',
    };
    initBot(args);
};

// Initialize offline bots
config.offlineAccounts.forEach(initBot);

module.exports = { addMicrosoftBot };
