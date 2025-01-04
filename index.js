const mineflayer = require('mineflayer');
const readline = require('readline');
const config = require('./src/config');
const CommandHandler = require('./src/commands');
const DiscordHandler = require('./src/discordHandler');
const tpManager = require('./src/tpManager');

// Initialize Discord Handler
new DiscordHandler();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let bots = []; // Array to store active bots
const activeUsers = new Set(); // Set to manage active users

// Listen for user input globally
rl.on('line', (line) => {
    bots.forEach((bot) => {
        if (bot.state === 'online') bot.chat(line);
    });
});

// Function to initialize a bot
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
        bots.push(bot); // Add the bot to the array

        let smpInterval; // Interval for SMP command

        bot.on('login', () => {
            console.log(`${bot.username} logged in`);
            if (args.auth === 'offline' && args.password) {
                bot.chat(`/login ${args.password}`);
            }
        });

        bot.on('spawn', async () => {
            console.log(`${bot.username} spawned in`);
            await bot.waitForTicks(60);
            bot.chat('/smp');
            smpInterval = setInterval(() => {
                bot.chat('/smp');
            }, 300000); // Every 5 minutes
        });

        bot.on('message', (jsonMsg) => {
            const message = jsonMsg.toString().trim();
            console.log(`[${bot.username}]:`, message);

            // Check for teleport requests
            if (message.includes('has requested to teleport to you')) {
                const requester = message.split(' ')[0];
                if (tpManager.isAllowed(requester)) {
                    bot.chat(`/tpaccept ${requester}`);
                    console.log(`Auto-accepted TP request from ${requester}`);
                }
            }

            // Handle chat commands
            const match = message.match(/^\s*strange_exe\s*\(\d+\)\s*»\s+(.*)$/);
            if (match) {
                const [, chatMessage] = match;
                if (chatMessage.startsWith('.')) {
                    const [command, ...args] = chatMessage.slice(1).split(' ');
                    processCommand('strange_exe', command, args);
                }
            }
        });

        function processCommand(username, command, args) {
            if (username.trim() !== 'strange_exe') {
                console.log(`Command from unauthorized user » ${username}`);
                bot.chat(`Better luck next time :rofl: @${username}`);
                return;
            }

            try {
                switch (command) {
                    case 'addtp':
                        if (args.length > 0) {
                            const userToAdd = args[0];
                            tpManager.addUser(userToAdd);
                            bot.chat(`Added ${userToAdd} to auto-tp accept list`);
                            console.log(`Added ${userToAdd} to auto-tp accept list`);
                        }
                        break;
                    case 'removetp':
                        if (args.length > 0) {
                            const userToRemove = args[0];
                            tpManager.removeUser(userToRemove);
                            bot.chat(`Removed ${userToRemove} from auto-tp accept list`);
                            console.log(`Removed ${userToRemove} from auto-tp accept list`);
                        }
                        break;
                    case 'listtp':
                        const userList = tpManager.listUsers().join(', ') || 'None';
                        bot.chat(`Allowed TP users: ${userList}`);
                        console.log(`Allowed TP users: ${userList}`);
                        break;
                    case 'copy':
                        if (args.length > 0) {
                            const textToCopy = args.join(' ');
                            bot.chat(textToCopy);
                            console.log(`Copied and executed » ${textToCopy}`);
                        }
                        break;
                    case 'quit':
                        if (args.length > 0) {
                            const botName = args[0];
                            const botToDisconnect = bots.find(b => b.username === botName);
                            if (botToDisconnect) {
                                try {
                                    botToDisconnect.quit('Disconnected by command');
                                    console.log(`Bot ${botName} has been disconnected.`);
                                    
                                    // Perform additional cleanup
                                    if (botToDisconnect._client && botToDisconnect._client.socket) {
                                        botToDisconnect._client.socket.destroy(); // Ensure the socket is closed
                                    }
                                    
                                    bots = bots.filter(b => b !== botToDisconnect); // Remove from the bots array
                                } catch (error) {
                                    console.error(`Error disconnecting bot ${botName}:`, error);
                                }
                            } else {
                                console.log(`No bot found with username ${botName}.`);
                                bot.chat(`Bot ${botName} not found.`);
                            }
                        } else {
                            bot.chat('Please provide the username of the bot to disconnect.');
                        }
                        break;

                    case 'join':
                        if (args.length > 0) {
                            commandHandler.handleJoin(args[0]);
                        }
                        break;
                    case 'gosmp':
                        commandHandler.handleGoSMP();
                        break;
                }
            } catch (error) {
                console.error(`Error processing command '${command}':`, error);
            }
        }

        bot.on('end', (reason) => {
            console.log(`${bot.username} disconnected » ${reason}`);
            clearInterval(smpInterval); // Clear the interval
            bots = bots.filter((b) => b !== bot); // Remove bot from array
            setTimeout(() => initBot(args), 10000); // Reinitialize bot after 10 seconds
        });

        bot.on('error', (err) => {
            console.log(`Unhandled error: ${err}`);
        });
    } catch (error) {
        console.error('Failed to initialize bot:', error);
        setTimeout(() => initBot(args), 10000); // Retry after delay
    }
};

// Initialize offline accounts
config.offlineAccounts.forEach(initBot);

module.exports = { addMicrosoftBot: initBot };
