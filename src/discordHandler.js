const { Client, GatewayIntentBits, Partials } = require('discord.js');
const dotenv = require('dotenv');
const { formatLogMessage } = require('./utils/logger');

class DiscordHandler {
  constructor() {
    dotenv.config();
    this.logChannelId = process.env.CHANNEL_ID;
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
      partials: [Partials.Channel]
    });

    this.logChannel = null;
    this.setupDiscordBot();
    this.overrideConsole();
  }

  setupDiscordBot() {
    this.client.once('ready', async () => {
      console.log(`Discord bot logged in as ${this.client.user.tag}`);
      
      try {
        this.logChannel = await this.client.channels.fetch(this.logChannelId);
        if (!this.logChannel) {
          console.error('Could not find the specified Discord channel');
          return;
        }
        console.log('Discord bot connected to logging channel');
      } catch (error) {
        console.error('Failed to fetch log channel:', error);
      }
    });

    this.client.on('error', console.error);
    this.client.login(process.env.DISCORD_TOKEN);
  }

  overrideConsole() {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = (...args) => {
      originalConsoleLog.apply(console, args);
      if (this.logChannel) {
        const message = formatLogMessage(args.join(' '));
        this.logChannel.send(`\`\`\`js\n${message}\`\`\``).catch(err => {
          originalConsoleLog('Failed to send message to Discord:', err);
        });
      }
    };

    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      if (this.logChannel) {
        const message = formatLogMessage(`ERROR: ${args.join(' ')}`);
        this.logChannel.send(`\`\`\`js\n❌ ${message}\`\`\``).catch(err => {
          originalConsoleError('Failed to send error to Discord:', err);
        });
      }
    };
  }
}

module.exports = DiscordHandler;