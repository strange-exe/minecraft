class CommandHandler {
    constructor(bot, activeUsers) {
        this.bot = bot;
        this.activeUsers = activeUsers;
    }

    handleJoin(username) {
        if (!this.activeUsers.has(username)) {
            this.activeUsers.add(username);
            this.bot.chat(`/tp ${username}`);
            console.log(`Joining ${username}`);
        }
    }

    handleCopy(command) {
        this.bot.chat(command);
    }

    handleGoSMP() {
        this.bot.chat('/smp');
    }
}

module.exports = CommandHandler;