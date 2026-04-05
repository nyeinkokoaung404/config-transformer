///////////////////////////////////////////////
// Multi-Protocol Transformer Bot
// Developer: t.me/nkka404
// Version: 2.0
///////////////////////////////////////////////

export default {
    async fetch(request, env) {
        try {
            const url = new URL(request.url);
            
            // Webhook verification for Telegram
            if (url.pathname === '/webhook' && request.method === 'POST') {
                const update = await request.json();
                await handleUpdate(update, env);
                return new Response('OK', { status: 200 });
            }
            
            // Health check endpoint
            if (url.pathname === '/health' && request.method === 'GET') {
                return new Response('Bot is running', { status: 200 });
            }
            
            return new Response('Not found', { status: 404 });
        } catch (error) {
            console.error('Fetch error:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    }
};

export async function handleUpdate(update, env) {
    const botToken = env.BOT_TOKEN;
    const kv = env.STATE_KV;

    try {
        if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text.trim();

            // Start Command
            if (text === '/start') {
                await sendMessage(chatId, "🚀 *404 Config Transformer Bot* 🚀\n\nWelcome! Send me your VLESS or TROJAN config link and I'll transform it with a bug address.\n\nသင်၏ VLESS သို့မဟုတ် TROJAN config link ကို ပို့ပေးပါ။ ကျွန်ုပ်က bug address ထည့်ပေးပါမည်။", botToken, true);
                return;
            }

            // Help Command
            if (text === '/help') {
                await sendMessage(chatId, "📖 *How to use:*\n\n1. Send a VLESS or TROJAN config link\n2. Choose Default Bug or Custom Bug\n3. If Custom Bug, send your bug address (IP or domain)\n4. Receive transformed config!\n\nExample bug addresses:\n• 172.67.133.97\n• example.com\n• 1.2.3.4", botToken, true);
                return;
            }

            // About Command
            if (text === '/about') {
                await sendMessage(chatId, "🤖 *404 Config Transformer Bot*\n\nDeveloper: @nkka404\nVersion: 2.0\n\nThis bot transforms VLESS and TROJAN configs by adding bug addresses for better connectivity.", botToken, true);
                return;
            }

            // Check if user has saved config for custom bug
            const savedConfig = await kv.get(`user_${chatId}`);
            
            if (savedConfig && !isValidConfigUrl(text)) {
                try {
                    // Validate bug address format
                    if (!isValidBugAddress(text)) {
                        await sendMessage(chatId, "❌ *Invalid Bug Address!*\n\nPlease send a valid IP address or domain name.\n\nExamples:\n• 172.67.133.97\n• example.com\n• 1.2.3.4", botToken, true);
                        return;
                    }
                    
                    const transformed = transformConfig(savedConfig, text, env);
                    const escapedConfig = escapeMarkdown(transformed);
                    
                    await sendMessage(chatId, `✅ *Custom Transform Success!*\n\n🌐 Host: \`${text}\`\n\n📦 *Transformed Config:*\n\`\`\`\n${escapedConfig}\n\`\`\``, botToken, true);
                    
                    // Clean up KV storage
                    await kv.delete(`user_${chatId}`);
                    return;
                } catch (e) {
                    console.error('Transform error:', e);
                    await sendMessage(chatId, "❌ *Error!*\n\nFailed to transform config. Please make sure your config link is valid and try again.\n\nSend /help for instructions.", botToken, true);
                    return;
                }
            }

            // Handle new config link
            if (isValidConfigUrl(text)) {
                await sendBugSelection(chatId, text, botToken);
            } else if (!savedConfig) {
                await sendMessage(chatId, "⚠️ *Invalid Input!*\n\nPlease send a VLESS or TROJAN config link.\n\nExample:\n• vless://...\n• trojan://...\n\nSend /help for more information.", botToken, true);
            }
        }

        // Handle button clicks
        if (update.callback_query) {
            await handleCallbackQuery(update, env);
        }
    } catch (error) {
        console.error('Handle update error:', error);
        try {
            if (update.message && update.message.chat.id) {
                await sendMessage(update.message.chat.id, "❌ *System Error!*\n\nSomething went wrong. Please try again later.\n\nIf problem persists, contact @nkka404", botToken, true);
            }
        } catch (e) {
            console.error('Failed to send error message:', e);
        }
    }
}

async function handleCallbackQuery(update, env) {
    const callbackQuery = update.callback_query;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const botToken = env.BOT_TOKEN;
    const kv = env.STATE_KV;

    try {
        // Default bug selection
        if (data === 'default') {
            const config = await kv.get(`temp_config_${chatId}`);
            if (!config) {
                await answerCallbackQuery(callbackQuery.id, "Session expired! Please send config again.", botToken);
                await editMessage(chatId, messageId, "❌ *Session Expired!*\n\nPlease send your config link again using /start", botToken);
                await kv.delete(`temp_config_${chatId}`);
                return;
            }
            
            const bug = env.BUG_ADDRESS || "172.67.133.97";
            const transformed = transformConfig(config, bug, env);
            const escapedConfig = escapeMarkdown(transformed);
            
            await answerCallbackQuery(callbackQuery.id, "✅ Default bug applied!", botToken);
            await editMessage(chatId, messageId, `✅ *Default Transform Success!*\n\n🌐 Host: \`${bug}\`\n\n📦 *Transformed Config:*\n\`\`\`\n${escapedConfig}\n\`\`\``, botToken);
            await kv.delete(`temp_config_${chatId}`);
        } 
        // Custom bug selection
        else if (data === 'ask_custom') {
            const config = await kv.get(`temp_config_${chatId}`);
            if (!config) {
                await answerCallbackQuery(callbackQuery.id, "Session expired! Please send config again.", botToken);
                await editMessage(chatId, messageId, "❌ *Session Expired!*\n\nPlease send your config link again using /start", botToken);
                return;
            }
            
            // Save config for custom bug input (10 minutes TTL)
            await kv.put(`user_${chatId}`, config, { expirationTtl: 600 });
            await kv.delete(`temp_config_${chatId}`);
            
            await answerCallbackQuery(callbackQuery.id, "✏️ Enter your custom bug address", botToken);
            await editMessage(chatId, messageId, "⌨️ *Custom Bug Address*\n\nPlease type and send your bug address (IP or domain name).\n\nExamples:\n• `172.67.133.97`\n• `example.com`\n• `1.2.3.4`\n\nYou have 10 minutes to respond.", botToken);
        }
    } catch (error) {
        console.error('Callback query error:', error);
        await answerCallbackQuery(callbackQuery.id, "Error processing request!", botToken);
        await sendMessage(chatId, "❌ *Error!*\n\nFailed to process your selection. Please try again with /start", botToken, true);
    }
}

async function sendBugSelection(chatId, config, token) {
    const kv = globalThis.env?.STATE_KV;
    if (kv) {
        // Store config temporarily (5 minutes TTL)
        await kv.put(`temp_config_${chatId}`, config, { expirationTtl: 300 });
    }
    
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: "🔧 *Select Bug Address Type* 🔧\n\nChoose which bug address you want to use for your config:",
        parse_mode: "MarkdownV2",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "☁️ Default Bug", callback_data: "default" },
                    { text: "✏️ Custom Bug", callback_data: "ask_custom" }
                ]
            ]
        }
    };
    
    try {
        await fetch(url, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
    } catch (error) {
        console.error('Send bug selection error:', error);
        await sendMessage(chatId, "❌ Failed to show options. Please try again with /start", token, true);
    }
}

function transformConfig(rawInput, bugAddress, env) {
    try {
        const url = new URL(rawInput);
        const protocol = url.protocol.replace(':', '');
        const port = env.DEFAULT_PORT || "443";
        const remark = url.hash || '#Transform_404';
        
        let auth, originalHost, path;
        
        if (protocol === 'vless') {
            // VLESS format: vless://uuid@host:port?params#remark
            auth = url.username;
            const params = Object.fromEntries(url.searchParams);
            originalHost = params.host || url.hostname;
            path = params.path || '/';
            
            return `${protocol}://${auth}@${bugAddress}:${port}?path=${encodeURIComponent(path)}&security=tls&alpn=http%2F1.1&encryption=none&host=${originalHost}&fp=chrome&type=ws&sni=${originalHost}${remark}`;
        } 
        else if (protocol === 'trojan') {
            // TROJAN format: trojan://password@host:port?query#remark
            auth = url.username;
            originalHost = url.hostname;
            path = url.searchParams.get('path') || '/';
            const sni = url.searchParams.get('sni') || originalHost;
            const alpn = url.searchParams.get('alpn') || 'http/1.1';
            const security = url.searchParams.get('security') || 'tls';
            
            return `${protocol}://${auth}@${bugAddress}:${port}?path=${encodeURIComponent(path)}&security=${security}&alpn=${alpn}&host=${originalHost}&fp=chrome&type=ws&sni=${sni}${remark}`;
        }
        else {
            throw new Error(`Unsupported protocol: ${protocol}`);
        }
    } catch (error) {
        console.error('Transform config error:', error);
        throw new Error(`Failed to transform config: ${error.message}`);
    }
}

function isValidConfigUrl(text) {
    if (!text || typeof text !== 'string') return false;
    
    try {
        const url = new URL(text);
        return url.protocol === 'vless:' || url.protocol === 'trojan:';
    } catch {
        return false;
    }
}

function isValidBugAddress(address) {
    if (!address || typeof address !== 'string') return false;
    
    address = address.trim();
    
    // IP address pattern (IPv4)
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Pattern.test(address)) {
        const parts = address.split('.');
        return parts.every(part => {
            const num = parseInt(part, 10);
            return num >= 0 && num <= 255;
        });
    }
    
    // Domain name pattern
    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(?:\.[a-zA-Z]{2,})+$/;
    if (domainPattern.test(address)) {
        return true;
    }
    
    return false;
}

function escapeMarkdown(text) {
    if (!text) return '';
    // Escape special characters for MarkdownV2
    return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

async function sendMessage(chatId, text, token, isMarkdown = false) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: isMarkdown ? "MarkdownV2" : undefined,
        disable_web_page_preview: true
    };
    
    try {
        const response = await fetch(url, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Send message error:', error);
        }
        
        return response;
    } catch (error) {
        console.error('Send message network error:', error);
        throw error;
    }
}

async function editMessage(chatId, messageId, text, token) {
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    const payload = {
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true
    };
    
    try {
        const response = await fetch(url, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Edit message error:', error);
        }
        
        return response;
    } catch (error) {
        console.error('Edit message network error:', error);
        throw error;
    }
}

async function answerCallbackQuery(callbackId, text, token, showAlert = false) {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    const payload = {
        callback_query_id: callbackId,
        text: text,
        show_alert: showAlert
    };
    
    try {
        await fetch(url, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
    } catch (error) {
        console.error('Answer callback query error:', error);
    }
}
