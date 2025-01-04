const cleanupBot = (bot, rl) => {
    // Remove readline listener
    rl.removeAllListeners('line');
    
    // Remove all bot listeners
    bot.removeAllListeners('login');
    bot.removeAllListeners('spawn');
    bot.removeAllListeners('message');
    bot.removeAllListeners('error');
    bot.removeAllListeners('end');
    
    // Close socket connection if it exists
    if (bot._client && bot._client.socket) {
        bot._client.socket.destroy();
    }
};

const setupBotEvents = (bot, rl, handlers) => {
    const { 
        onLogin, 
        onSpawn, 
        onMessage, 
        onError, 
        onEnd 
    } = handlers;

    rl.on('line', line => bot.chat(line));
    bot.on('login', onLogin);
    bot.on('spawn', onSpawn);
    bot.on('message', onMessage);
    bot.on('error', onError);
    bot.on('end', (reason) => {
        onEnd(reason);
        cleanupBot(bot, rl);
    });
};

module.exports = {
    cleanupBot,
    setupBotEvents
};
