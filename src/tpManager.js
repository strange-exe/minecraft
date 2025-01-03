const fs = require('fs');
const path = require('path');

class TPManager {
    constructor() {
        this.configPath = path.join(__dirname, 'allowed-tp-users.json');
        this.allowedUsers = new Set();
        this.loadAllowedUsers();
    }

    loadAllowedUsers() {
        try {
            if (fs.existsSync(this.configPath)) {
                const users = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                this.allowedUsers = new Set(users);
            }
        } catch (error) {
            console.error('Error loading allowed users:', error);
        }
    }

    saveAllowedUsers() {
        try {
            const dirPath = path.dirname(this.configPath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            fs.writeFileSync(this.configPath, JSON.stringify([...this.allowedUsers], null, 2));
        } catch (error) {
            console.error('Error saving allowed users:', error);
        }
    }

    addUser(username) {
        this.allowedUsers.add(username);
        this.saveAllowedUsers();
    }

    removeUser(username) {
        this.allowedUsers.delete(username);
        this.saveAllowedUsers();
    }

    isAllowed(username) {
        return this.allowedUsers.has(username);
    }

    listUsers() {
        return [...this.allowedUsers];
    }
}

module.exports = new TPManager();
