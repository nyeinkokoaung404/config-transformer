///////////////////////////////////////////////
// Multi-Protocol Transformer Bot v2.0
// Developer: t.me/nkka404
// Description: Transform VLESS/Trojan configs with different bug addresses
///////////////////////////////////////////////

// ==================== CONFIGURATION ====================
const BUG_SERVERS = [
    { 
        id: "cf", 
        label: "☁️ Cloudflare", 
        ip: "172.67.133.97", 
        description: "Fast & Global CDN",
        color: "#F38020"
    },
    { 
        id: "ceir", 
        label: "🔒 CEIR", 
        ip: "104.26.14.196", 
        description: "Secure Connection",
        color: "#4CAF50"
    },
    { 
        id: "mpt", 
        label: "📡 MPT", 
        ip: "mpt.com.mm", 
        description: "Local Myanmar ISP",
        color: "#2196F3"
    }
];

// ==================== UTILITY FUNCTIONS ====================

/**
 * Escape special characters for MarkdownV2 format
 */
function escapeMarkdown(text) {
    const specialChars = /[_*[\]()~`>#+\-=|{}.!]/g;
    return text.replace(specialChars, '\\$&');
}

/**
 * Format config output with syntax highlighting
 */
function formatConfigOutput(bugLabel, config, originalLink = null) {
    const escapedConfig = escapeMarkdown(config);
    const separator = "━━━━━━━━━━━━━━━━━━━━━━━━━";
    
    let output = `✅ *${bugLabel}* - Configuration Ready\n\n`;
    output += `\`\`\`\n${config}\n\`\`\`\n\n`;
    output += `${separator}\n\n`;
    output += `📋 *How to use:*\n`;
    output += `1️⃣ Copy the configuration above\n`;
    output += `2️⃣ Import to your VPN client\n`;
    output += `3️⃣ Connect and enjoy!\n\n`;
    output += `${separator}\n\n`;
    output += `⚡ *Server Info:* ${bugLabel}\n`;
    output += `🔗 *Protocol:* ${getProtocolFromConfig(config)}\n\n`;
    output += `_✨ Transformed by @nkka404 Bot_`;
    
    return output;
}

/**
 * Extract protocol from config string
 */
function getProtocolFromConfig(config) {
    if (config.startsWith('vless://')) return 'VLESS';
    if (config.startsWith('trojan://')) return 'Trojan';
    return 'Unknown';
}

/**
 * Generate inline keyboard for bug selection
 */
function generateBugKeyboard(originalConfig) {
    const keyboard = [
        [
            { text: "☁️ Cloudflare", callback_data: "cf" },
            { text: "🔒 CEIR", callback_data: "ceir" }
        ],
        [
            { text: "📡 MPT", callback_data: "mpt" }
        ],
        [
            { text: "🔄 Cancel", callback_data: "cancel" }
        ]
    ];
    
    // Add footer note
    return {
        inline_keyboard: keyboard,
        resize_keyboard: true
    };
}

/**
 * Generate success keyboard with additional options
 */
function generateSuccessKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: "🔄 Transform Another", callback_data: "new" },
                { text: "📋 Copy Config", copy_text: { text: "Config copied!" } }
            ]
        ],
        resize_keyboard: true
    };
}

/**
 * Validate configuration URL
 */
function isValidConfig(config) {
    return config.startsWith('vless://') || config.startsWith('trojan://');
}

/**
 * Extract original host from config parameters
 */
function extractOriginalHost(url, params) {
    if (params.host) return params.host;
    if (params.sni) return params.sni;
    if (params.add) return params.add;
    return url.hostname;
}

/**
 * Transform configuration with bug address
 */
function transformConfig(rawInput, bugAddress, env = {}) {
    try {
        const url = new URL(rawInput);
        const protocol = url.protocol.replace(':', '');
        const params = new URLSearchParams(url.search);
        
        // Extract authentication
        let auth = '';
        if (protocol === 'vless') {
            auth = decodeURIComponent(url.username);
        } else {
            auth = decodeURIComponent(url.password || url.username);
        }
        
        // Extract original host
        const originalHost = extractOriginalHost(url, Object.fromEntries(params));
        
        // Get configuration values with defaults
        const port = env.DEFAULT_PORT || "443";
        const path = params.get('path') || '/';
        const remark = url.hash || '#Transform_Bot';
        
        // Build new parameters
        const newParams = new URLSearchParams({
            path: path,
            security: "tls",
            alpn: "http/1.1",
            encryption: "none",
            insecure: "0",
            host: originalHost,
            fp: "chrome",
            type: "ws",
            allowInsecure: "0",
            sni: originalHost
        });
        
        // Add optional parameters if they exist
        if (params.has('peer')) newParams.set('peer', params.get('peer'));
        if (params.has('verify')) newParams.set('verify', params.get('verify'));
        
        // Construct final config
        const transformedConfig = `${protocol}://${auth}@${bugAddress}:${port}?${newParams.toString()}${remark}`;
        
        return transformedConfig;
    } catch (error) {
        throw new Error(`Transformation failed: ${error.message}`);
    }
}

// ==================== TELEGRAM API HANDLER ====================

/**
 * Send message to Telegram
 */
async function sendMessage(chatId, text, token, parseMode = 'MarkdownV2', keyboard = null, disablePreview = true) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    const payload = {
        chat_id: chatId,
        text: text,
        disable_web_page_preview: disablePreview
    };
    
    if (parseMode) payload.parse_mode = parseMode;
    if (keyboard) payload.reply_markup = JSON.stringify(keyboard);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if (!result.ok) {
            console.error('Telegram API Error:', result);
        }
        return result;
    } catch (error) {
        console.error('Send message error:', error);
        throw error;
    }
}

/**
 * Answer callback query
 */
async function answerCallback(callbackId, token, text = null, showAlert = false) {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    
    const payload = {
        callback_query_id: callbackId
    };
    
    if (text) {
        payload.text = text;
        payload.show_alert = showAlert;
    }
    
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Answer callback error:', error);
    }
}

/**
 * Edit message (for updating existing message)
 */
async function editMessageText(chatId, messageId, text, token, keyboard = null) {
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    
    const payload = {
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: 'MarkdownV2'
    };
    
    if (keyboard) payload.reply_markup = JSON.stringify(keyboard);
    
    try {
        return await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Edit message error:', error);
    }
}

// ==================== MESSAGE TEMPLATES ====================

const MessageTemplates = {
    welcome: () => {
        return `🌟 *WELCOME TO CONFIG TRANSFORMER BOT* 🌟

━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *What I can do:*
• Transform VLESS configurations
• Transform Trojan configurations
• Switch between different bug servers
• Optimize for your network

━━━━━━━━━━━━━━━━━━━━━━━━━

📌 *How to use:*
1️⃣ Send me your VLESS/Trojan link
2️⃣ Choose a bug server
3️⃣ Get transformed config instantly!

━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ *Supported Bug Servers:*
${BUG_SERVERS.map(b => `• ${b.label} - ${b.description}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━

_💡 Just send me your config link to start!_`;
    },

    configReceived: (config, protocol) => {
        return `🔍 *CONFIGURATION DETECTED*

━━━━━━━━━━━━━━━━━━━━━━━━━

📡 *Protocol:* ${protocol}
🔗 *Status:* Valid configuration

━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *Select a bug server below* to transform your configuration:

\`${escapeMarkdown(config.substring(0, 100))}...\`

━━━━━━━━━━━━━━━━━━━━━━━━━

_⚡ Choose the best server for your network_`;
    },

    processing: (bugLabel) => {
        return `🔄 *Processing your request...*

━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ Transforming config with *${bugLabel}* server
⏳ Please wait a moment

━━━━━━━━━━━━━━━━━━━━━━━━━

_✨ This may take a few seconds_`;
    },

    error: (errorMsg) => {
        return `❌ *TRANSFORMATION FAILED*

━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *Error:* ${errorMsg}

━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 *Troubleshooting:*
• Check if your config link is valid
• Make sure it's VLESS or Trojan protocol
• Try sending the link again

━━━━━━━━━━━━━━━━━━━━━━━━━

_💡 Use /start to get help_`;
    },

    invalidConfig: () => {
        return `⚠️ *INVALID CONFIGURATION*

━━━━━━━━━━━━━━━━━━━━━━━━━

❌ The link you sent is not recognized.

✅ *Supported formats:*
• \`vless://...\`
• \`trojan://...\`

━━━━━━━━━━━━━━━━━━━━━━━━━

📤 Please send a valid VLESS or Trojan configuration link.

_💡 Use /start for instructions_`;
    },

    cancel: () => {
        return `🚫 *OPERATION CANCELLED*

━━━━━━━━━━━━━━━━━━━━━━━━━

You have cancelled the transformation process.

━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Send a new config link to start again!

_✨ Ready when you are_`;
    },

    success: (bugLabel) => {
        return `✅ *TRANSFORMATION COMPLETE*

━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Successfully transformed with *${bugLabel}* server!

━━━━━━━━━━━━━━━━━━━━━━━━━

💾 *Your new config is ready above*

━━━━━━━━━━━━━━━━━━━━━━━━━

_🔁 Click below to transform another config_`;
    }
};

// ==================== MAIN HANDLER ====================

export async function handleUpdate(update, env) {
    const botToken = env.BOT_TOKEN;
    
    if (!botToken) {
        console.error('BOT_TOKEN not configured in environment');
        return;
    }
    
    try {
        // 1. Handle Callback Queries
        if (update.callback_query) {
            const callbackData = update.callback_query.data;
            const chatId = update.callback_query.message.chat.id;
            const messageId = update.callback_query.message.message_id;
            const messageText = update.callback_query.message.text || "";
            
            // Handle cancel
            if (callbackData === 'cancel') {
                await editMessageText(chatId, messageId, MessageTemplates.cancel(), botToken);
                await answerCallback(update.callback_query.id, botToken, "Operation cancelled", false);
                return;
            }
            
            // Handle new transformation request
            if (callbackData === 'new') {
                await sendMessage(chatId, MessageTemplates.welcome(), botToken, 'MarkdownV2');
                await answerCallback(update.callback_query.id, botToken, "Send new config link", false);
                return;
            }
            
            // Extract config from message
            const configMatch = messageText.match(/(vless|trojan):\/\/[^\s]+/);
            const rawConfig = configMatch ? configMatch[0] : null;
            
            const selectedBug = BUG_SERVERS.find(b => b.id === callbackData);
            
            if (selectedBug && rawConfig) {
                // Show processing message
                await editMessageText(chatId, messageId, MessageTemplates.processing(selectedBug.label), botToken);
                await answerCallback(update.callback_query.id, botToken, `Processing with ${selectedBug.label}...`, false);
                
                try {
                    // Transform config
                    const transformedConfig = transformConfig(rawConfig, selectedBug.ip, env);
                    
                    // Format output
                    const outputMessage = formatConfigOutput(selectedBug.label, transformedConfig, rawConfig);
                    const successKeyboard = generateSuccessKeyboard();
                    
                    // Send final result
                    await sendMessage(chatId, outputMessage, botToken, 'MarkdownV2', successKeyboard);
                    
                    // Delete or update original message
                    try {
                        await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ chat_id: chatId, message_id: messageId })
                        });
                    } catch (e) {
                        // Ignore deletion error
                    }
                    
                } catch (error) {
                    console.error('Transformation error:', error);
                    await sendMessage(chatId, MessageTemplates.error(error.message), botToken, 'MarkdownV2');
                }
            } else {
                await answerCallback(update.callback_query.id, botToken, "Config not found! Please send again", true);
            }
            return;
        }
        
        // 2. Handle Messages
        if (!update.message || !update.message.text) return;
        
        const chatId = update.message.chat.id;
        const text = update.message.text.trim();
        
        // Handle /start command
        if (text === '/start') {
            await sendMessage(chatId, MessageTemplates.welcome(), botToken, 'MarkdownV2');
            return;
        }
        
        // Handle /help command
        if (text === '/help') {
            await sendMessage(chatId, MessageTemplates.welcome(), botToken, 'MarkdownV2');
            return;
        }
        
        // Handle /about command
        if (text === '/about') {
            const about = `🤖 *ABOUT THIS BOT*

━━━━━━━━━━━━━━━━━━━━━━━━━

*Version:* 2.0
*Developer:* @nkka404
*Protocols:* VLESS, Trojan

━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *Features:*
• Multi-server support
• Fast transformation
• Easy to use
• Markdown formatting

━━━━━━━━━━━━━━━━━━━━━━━━━

_✨ Made with passion for the community_`;
            
            await sendMessage(chatId, about, botToken, 'MarkdownV2');
            return;
        }
        
        // Handle config transformation
        if (isValidConfig(text)) {
            const protocol = getProtocolFromConfig(text);
            const keyboard = generateBugKeyboard(text);
            
            await sendMessage(
                chatId, 
                MessageTemplates.configReceived(text, protocol), 
                botToken, 
                'MarkdownV2', 
                keyboard
            );
        } 
        // Handle invalid input
        else if (text && !text.startsWith('/')) {
            await sendMessage(chatId, MessageTemplates.invalidConfig(), botToken, 'MarkdownV2');
        }
        
    } catch (error) {
        console.error('Update handling error:', error);
        const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
        if (chatId) {
            await sendMessage(chatId, MessageTemplates.error('Internal server error'), botToken, 'MarkdownV2');
        }
    }
}

// ==================== EXPORTS FOR WORKER ====================

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // Handle webhook
        if (url.pathname === '/webhook' && request.method === 'POST') {
            const update = await request.json();
            await handleUpdate(update, env);
            return new Response('OK', { status: 200 });
        }
        
        // Set webhook endpoint
        if (url.pathname === '/set-webhook' && request.method === 'GET') {
            const botToken = env.BOT_TOKEN;
            const webhookUrl = `${url.origin}/webhook`;
            
            const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`);
            const result = await response.json();
            
            return new Response(JSON.stringify(result, null, 2), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Health check
        if (url.pathname === '/health') {
            return new Response('OK', { status: 200 });
        }
        
        return new Response('Bot is running', { status: 200 });
    }
};
