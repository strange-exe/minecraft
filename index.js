const mineflayer = require('mineflayer');
const readline = require('readline');
const config = require('./src/config');
const commandHandler = require('./src/commands');
const DiscordHandler = require('./src/discordHandler');
const tpManager = require('./src/tpManager');

// Initialize Discord Handler
new DiscordHandler();

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
            version: config.defaultServer.version,
            auth: args.auth
        };

        if (args.auth === 'microsoft') {
            botOptions = {
                ...botOptions,
                username: args.username
            };
        } else {
            botOptions = {
                ...botOptions,
                username: args.username
            };
        }

        const intervalTime = 300000;
        const bot = mineflayer.createBot(botOptions);
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
            setInterval(() => {
                bot.chat('/smp');
            }, intervalTime);
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

            // Handle commands from chat with Microsoft account format
            let match = message.match(/^(?:\[.*?\] )?(\w+)\s*»\s*(.*)$/);
            if (match) {
                const [, username, chatMessage] = match;
                if (chatMessage.startsWith('.')) {
                    const [command, ...args] = chatMessage.slice(1).split(' ');
                    processCommand(username, command, args);
                }
            }

            // Handle commands from Discord
            match = message.match(/^\[Discord \| [^\]]+\] (\w+) » (.*)$/);
            if (match) {
                const [, username, chatMessage] = match;
                if (chatMessage.startsWith('.')) {
                    const [command, ...args] = chatMessage.slice(1).split(' ');
                    processCommand(username, command, args);
                }
            }
        });

        function processCommand(username, command, args) {
            if (username.trim() !== 'strange_exe') {
                console.log(`Command from non-authorized user » ${username}`);
                bot.chat(`Better luck next time :rofl:`);
                return;
            }

            try {
                switch(command.toLowerCase()) {
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
                                botToDisconnect.end('Disconnected by command');
                                bots = bots.filter(b => b !== botToDisconnect);
                                console.log(`Bot ${botName} has been disconnected.`);
                            }
                        } else {
                            bot.end('Disconnected by command');
                            bots = bots.filter(b => b !== bot);
                            console.log(`Bot ${bot.username} has been disconnected.`);
                        }
                        break;
                    case 'join':
                        if (args.length > 0) {
                            commandHandler.handleJoin(args[0]);
                            console.log(`Reconnecting to server: ${args[0]}`);
                        }
                        break;
                    case 'gosmp':
                        bot.chat('/smp');
                        console.log('Executing SMP command');
                        break;
                }
            } catch (error) {
                console.error(`Error while processing command '${command}':`, error);
            }
        }

        bot.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
                console.log(`Failed to connect to ${err.address}:${err.port}`);
            } else {
                console.log(`Unhandled error » ${err}`);
            }
        });

        bot.on('end', (reason) => {
            console.log(`${bot.username} disconnected » ${reason}`);
            bots = bots.filter(b => b !== bot);
            
            // Only reconnect if the reason is "Reconnecting to server"
            if (reason === 'Reconnecting to server') {
                setTimeout(() => initBot(args), 5000);
            }
        });
    } catch (error) {
        console.error('Failed to initialize bot »', error);
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

if (config.offlineAccounts) {
    config.offlineAccounts.forEach(account => {
        initBot({
            username: account.username,
            auth: 'offline',
            password: account.password
        });
    });
}

module.exports = { addMicrosoftBot };
