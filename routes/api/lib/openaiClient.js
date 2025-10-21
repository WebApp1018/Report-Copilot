// Lazy initialization for OpenAI client.
const { OpenAI } = require('openai');
let client = null;
function getOpenAI() {
    if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return client;
}
module.exports = { getOpenAI };