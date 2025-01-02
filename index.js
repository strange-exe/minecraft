const mineflayer = require('mineflayer');
const readline = require('readline');
const config = require('./src/config');
const { getMicrosoftAuth } = require('./src/auth');
const { logMessage } = require('./src/logger');
const CommandHandler = require('./src/commands');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let bots = [];
const activeUsers = new Set();

const initBot = async (args) => {
    try {
        let botOptions = {
            host: config.defaultServer.host,
            version: config.defaultServer.version
        };

        if (args.auth === 'microsoft') {
            botOptions = {
                ...botOptions,
                auth: 'microsoft',
                username: config.offlineAccounts.username,
                password: config.offlineAccounts.password
            };
        } else {
            botOptions = {
                ...botOptions,
                username: args.username
            };
        }

        const bot = mineflayer.createBot(botOptions);
        const commandHandler = new CommandHandler(bot, activeUsers);
        bots.push(bot);

        rl.on('line', line => bot.chat(line));

        bot.on('login', () => {
            let botSocket = bot._client.socket;
            console.log(`Logged in to ${botSocket.server ? botSocket.server : botSocket._host}`);
            
            if (args.auth === 'offline' && args.password) {
                bot.chat(`/login ${args.password}`);
            }
        });

        bot.on('spawn', async () => {
            console.log(`${bot.username} spawned in`);
            await bot.waitForTicks(60);
            bot.chat("/smp");
        });

        bot.on('game', (oldGame, newGame) => {
            // Check if the dimension has changed
            if (oldGame && newGame && oldGame.dimension !== newGame.dimension) {
                console.log(`Dimension changed from ${oldGame.dimension} to ${newGame.dimension}`);
                bot.chat("/smp");
            }
        });

        bot.on('message', (jsonMsg) => {
            const message = jsonMsg.toString();
            console.log('Received message:', message); // Log all messages for debugging

            // Function to process commands
            const processCommand = (username, command, args) => {
                if (username.trim() !== 'strange_exe') {
                    console.log(`Command from non-authorized user: ${username}`);
                    bot.chat(`Better luck next time :rofl: @${username}`);
                    return;
                }

                try {
                    if (command === 'copy') {
                        if (args.length > 0) {
                            const textToCopy = args.join(' ');
                            bot.chat(textToCopy);
                            console.log(`Copied and executed: ${textToCopy}`);
                        } else {
                            console.log('Usage: .copy [text]');
                        }
                    } else if (command === 'quit') {
                        if (args.length > 0) {
                            const botName = args[0];
                            const botToDisconnect = bots.find(b => b.username === botName);
                            if (botToDisconnect) {
                                botToDisconnect.quit('Disconnected by command');
                                console.log(`Bot ${botName} has been disconnected.`);
                            } else {
                                console.log(`No bot found with the name ${botName}.`);
                            }
                        } else {
                            console.log('Usage: .quit [botName]');
                        }
                    } else if (command === 'join') {
                        if (args.length > 0) {
                            commandHandler.handleJoin(args[0]);
                        } else {
                            console.log('Usage: .join [username]');
                        }
                    } else if (command === 'gosmp') {
                        commandHandler.handleGoSMP();
                    } else {
                        console.log(`Unknown command: ${command}`);
                    }
                } catch (error) {
                    console.error(`Error while processing command '${command}':`, error);
                }
            };
            
            // Try to match Minecraft format for strange_exe
            let match = message.match(/^\s*strange_exe\s*\(\d+\)\s*»\s+(.*)$/);
            if (match) {
                const [, chatMessage] = match;
                logMessage(`Minecraft - strange_exe: ${chatMessage}`);

                if (chatMessage.startsWith('.')) {
                    const [command, ...args] = chatMessage.slice(1).split(' ');
                    processCommand('strange_exe', command, args);
                }
                return;
            }
            

            // Try to match Discord format
            match = message.match(/^\[Discord \| [^\]]+\] (\w+) » (.*)$/);
            if (match) {
                const [, username, chatMessage] = match;
                logMessage(`Discord - ${username}: ${chatMessage}`);

                if (chatMessage.startsWith('.')) {
                    const [command, ...args] = chatMessage.slice(1).split(' ');
                    processCommand(username, command, args);
                }
                return;
            }
            if (match) {
                const [, username, chatMessage] = match;
                console.log(`Unmatched : ${username}: ${chatMessage}`);
            }
        });

        bot.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
                console.log(`Failed to connect to ${err.address}:${err.port}`);
            } else {
                console.log(`Unhandled error: ${err}`);
            }
        });

        bot.on('end', (reason) => {
            console.log(`${bot.username} disconnected: ${reason}`);
            setTimeout(() => initBot(args), 10000);
        });
    } catch (error) {
        console.error('Failed to initialize bot:', error);
        setTimeout(() => initBot(args), 10000);
    }
};

const addMicrosoftBot = (email) => {
    const args = {
        username: email,
        auth: 'microsoft'
    };
    initBot(args);
};

// Initialize offline bots
config.offlineAccounts.forEach(initBot);

module.exports = { addMicrosoftBot };

