import dotenv from 'dotenv'; 
dotenv.config(); 
 
import {  
    Client,  
    GatewayIntentBits, 
    ButtonBuilder, 
    ActionRowBuilder,  
    ButtonStyle 
} from 'discord.js'; 
 
import { GoogleGenerativeAI } from "@google/generative-ai"; 
 
const client = new Client({  
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.DirectMessages, 
        GatewayIntentBits.MessageContent 
    ]  
}); 
 
// Initialize Google Gemini API 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // retrieve the api key from .env
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
 
// Discord bot login 
client.login(process.env.DISCORD_TOKEN); // retrieve the discord bot token from .env
 
// log when the bot is ready 
client.on('ready', () => { 
    console.log(`Logged in as ${client.user.tag}!`); 
}); 

// Range of time for the news generation
const today = new Date();
const formatToday = String(today.getDate()).padStart(2, '0') + "-" + today.toLocaleString('en-US', { month: 'short' }).toLowerCase() + "-" + today.getFullYear();

const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);
const formatYesterday = String(yesterday.getDate()).padStart(2, '0') + "-" + yesterday.toLocaleString('en-US', { month: 'short' }).toLowerCase() + "-" + yesterday.getFullYear();

const newPrompt = `As a news analyst, provide a concise summary of the most important world news from ${formatYesterday} to ${formatToday}. The summary should be formatted as a single, cohesive paragraph that provides an overall summary of the key themes and interconnected events across the specified sectors.
Then, break down the summary into three distinct sections, each with bullet points:
1. Technology: Summarize the most impactful news, focusing on major developments, breakthroughs, or significant events involving leading companies. Include any relevant statistics or market movements, particularly for big tech companies.
2. Economy: Summarize the most important global economic news. Focus on trends, policy changes, and market performance. Include stock market news, such as the movement of major tech company stocks, and provide specific data points where available.
3. Thailand Politics: Summarize the most critical political developments and their implications. Provide a balanced view of the events, drawing from multiple sources to show different sides of the story, as is often done by outlets like Ground News.
Each bullet point should be 1-2 sentences long and the whole message should be less than 2000 characters long. Include the source of information for all key facts and statistics. Ensure the tone is objective and informative, suitable for a reader who is already proficient in tech and wants to expand their knowledge in economics and politics.`

// helper: fetch news from Gemini 
async function fetchNewsFromGemini() { 
    const prompt = newPrompt; 
 
    const result = await model.generateContent(prompt); 
    const response = result.response; 
    const news = response.text(); 
    
    // Embeded Message
    const embed = {
        title: '📰 Daily World News',
        description: news.substring(0, 4096), // Embed descriptions can be up to 4096 characters
        color: 0x0099FF,
        timestamp: new Date(),
        footer: {
            text: 'Daily News Update'
        }
    };

    return embed;

} 
 
client.on("messageCreate", async (message) => { 
    console.log(message.content)
 
    const TARGET_CHANNEL_ID = process.env.CHANNEL_ID; // retrieve the discord channel ID from .env
    if (message.channel.id !== TARGET_CHANNEL_ID) return; 
 
    if (!message.author.bot) { 
 
        // create a button 
        const newsbtn = new ButtonBuilder() 
            .setCustomId('genNews') 
            .setLabel('Generate News') 
            .setStyle(ButtonStyle.Primary); 
 
        // wrap the button in an action row 
        const row = new ActionRowBuilder() 
            .addComponents(newsbtn); 
 
        await message.channel.send({ 
            content: "Generate News", 
            components: [row] 
        }); 
    } 
}); 
 
// handle button interaction 
client.on('interactionCreate', async (interaction) => { 
    if (!interaction.isButton()) return; 
 
    if (interaction.customId === 'genNews') { 
        await interaction.reply({ 
            content: '⏳ Generating news...', 
            ephemeral: true 
        }); 
 
        try { 
            const news = await fetchNewsFromGemini(); 
            const TARGET_CHANNEL_ID = process.env.CHANNEL_ID; // retrieve the discord channel ID from .env
            const channel = await client.channels.fetch(TARGET_CHANNEL_ID); 
 
            await channel.send({embeds: [news]}); 

        } catch (err) { 
            console.error("Error fetching news:", err); 
            await interaction.followUp({ 
                content: "❌ Failed to fetch news.", 
                ephemeral: true 
            }); 
        } 
    } 
});
