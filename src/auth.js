const { Authflow, Titles } = require('prismarine-auth');

async function getMicrosoftAuth(email) {
    try {
        const authflow = new Authflow(email, './authCache', { 
            flow: 'msal',
            relyingParty: 'rp://api.minecraftservices.com/'
        });
        
        const token = await authflow.getMinecraftJavaToken();
        return {
            ...token,
            auth: 'microsoft'
        };
    } catch (error) {
        console.error('Microsoft authentication failed:', error);
        throw error;
    }
}

module.exports = { getMicrosoftAuth };