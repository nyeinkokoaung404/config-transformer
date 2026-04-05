///////////////////////////////////////////////
// Multi-Protocol Transformer Bot
// Developer: t.me/nkka404
// Version: 2.0 (Stable)
///////////////////////////////////////////////

async function handleUpdate(update, env) {
    const botToken = env.BOT_TOKEN;
    const kv = env.STATE_KV;

    try {
        // ၁။ Message လက်ခံခြင်း
        if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text.trim();

            if (text === '/start') {
                await sendMessage(chatId, "🚀 *404 Config Transformer Bot* 🚀\n\nVLESS သို့မဟုတ် TROJAN config link ကို ပို့ပေးပါ။ ကျွန်ုပ်က bug address ထည့်ပေးပါမည်။", botToken, true);
                return;
            }

            if (text === '/help') {
                await sendMessage(chatId, "📖 *အသုံးပြုပုံ:*\n\n1. VLESS/TROJAN link ပို့ပါ\n2. Default Bug သို့မဟုတ် Custom Bug ကိုရွေးပါ\n3. Custom Bug ဆိုလျှင် IP/Domain ရိုက်ပို့ပေးပါ\n4. Transformed config ရယူပါ!", botToken, true);
                return;
            }

            // Custom Bug Address ကို စောင့်ဆိုင်းနေခြင်း ရှိမရှိ စစ်ဆေးခြင်း
            const savedConfig = await kv.get(`user_${chatId}`);
            
            if (savedConfig && !isValidConfigUrl(text)) {
                if (!isValidBugAddress(text)) {
                    await sendMessage(chatId, "❌ *Invalid Bug Address!*\n\nမှန်ကန်သော IP သို့မဟုတ် Domain ပို့ပေးပါ။", botToken, true);
                    return;
                }
                
                const transformed = transformConfig(savedConfig, text, env);
                const escapedConfig = escapeMarkdown(transformed);
                
                await sendMessage(chatId, `✅ *Custom Transform Success!*\n\n🌐 Host: \`${text}\`\n\n📦 *Transformed Config:*\n\`\`\`\n${escapedConfig}\n\`\`\``, botToken, true);
                await kv.delete(`user_${chatId}`);
                return;
            }

            // Config အသစ် ပို့လာခြင်း
            if (isValidConfigUrl(text)) {
                await sendBugSelection(chatId, text, botToken, env);
            } else if (!savedConfig) {
                await sendMessage(chatId, "⚠️ *Invalid Input!*\n\nVLESS သို့မဟုတ် TROJAN link သာ ပို့ပေးပါ။", botToken, true);
            }
        }

        // ၂။ ခလုတ်နှိပ်ခြင်း (Callback Query)
        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query, env);
        }
    } catch (error) {
        console.error('Update Error:', error);
    }
}

async function handleCallbackQuery(callbackQuery, env) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const botToken = env.BOT_TOKEN;
    const kv = env.STATE_KV;

    if (data === 'default') {
        const config = await kv.get(`temp_config_${chatId}`);
        if (!config) {
            await answerCallbackQuery(callbackQuery.id, "Session expired!", botToken);
            return;
        }
        
        const bug = env.BUG_ADDRESS || "172.67.133.97";
        const transformed = transformConfig(config, bug, env);
        const escapedConfig = escapeMarkdown(transformed);
        
        await answerCallbackQuery(callbackQuery.id, "✅ Default bug applied!", botToken);
        await editMessage(chatId, messageId, `✅ *Default Transform Success!*\n\n🌐 Host: \`${bug}\`\n\n\`\`\`\n${escapedConfig}\n\`\`\``, botToken);
        await kv.delete(`temp_config_${chatId}`);
    } 
    else if (data === 'ask_custom') {
        const config = await kv.get(`temp_config_${chatId}`);
        if (!config) {
            await answerCallbackQuery(callbackQuery.id, "Session expired!", botToken);
            return;
        }
        
        await kv.put(`user_${chatId}`, config, { expirationTtl: 600 });
        await kv.delete(`temp_config_${chatId}`);
        
        await answerCallbackQuery(callbackQuery.id, "✏️ Enter bug address", botToken);
        await editMessage(chatId, messageId, "⌨️ *Custom Bug Address*\n\nအသုံးပြုလိုသော Bug address (IP/Domain) ကို ရိုက်ပို့ပေးပါ။ (၁၀ မိနစ်အတွင်း)", botToken);
    }
}

async function sendBugSelection(chatId, config, token, env) {
    const kv = env.STATE_KV;
    if (kv) {
        await kv.put(`temp_config_${chatId}`, config, { expirationTtl: 300 });
    }
    
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: "🔧 *Select Bug Address Type*\n\nအသုံးပြုလိုသော Bug အမျိုးအစားကို ရွေးချယ်ပါ:",
        parse_mode: "MarkdownV2",
        reply_markup: {
            inline_keyboard: [[
                { text: "☁️ Default Bug", callback_data: "default" },
                { text: "✏️ Custom Bug", callback_data: "ask_custom" }
            ]]
        }
    };
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

function transformConfig(rawInput, bugAddress, env) {
    const url = new URL(rawInput);
    const protocol = url.protocol.replace(':', '');
    const port = env.DEFAULT_PORT || "443";
    const remark = url.hash || '#Transform_404';
    
    const params = Object.fromEntries(url.searchParams);
    const auth = url.username;
    const originalHost = params.host || url.hostname;
    const path = params.path || '/';
    const sni = params.sni || originalHost;

    // WS Transform logic
    return `${protocol}://${auth}@${bugAddress}:${port}?path=${encodeURIComponent(path)}&security=tls&alpn=http%2F1.1&encryption=none&host=${originalHost}&fp=chrome&type=ws&sni=${sni}${remark}`;
}

// Helpers
function isValidConfigUrl(text) {
    try { const url = new URL(text); return ['vless:', 'trojan:'].includes(url.protocol); } catch { return false; }
}

function isValidBugAddress(address) {
    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(?:\.[a-zA-Z]{2,})+$/;
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    return domainPattern.test(address) || ipPattern.test(address);
}

function escapeMarkdown(text) {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

async function sendMessage(chatId, text, token, isMarkdown = false) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    return fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: isMarkdown ? "MarkdownV2" : undefined, disable_web_page_preview: true }) 
    });
}

async function editMessage(chatId, messageId, text, token) {
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    return fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "MarkdownV2" }) 
    });
}

async function answerCallbackQuery(callbackId, text, token) {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    return fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ callback_query_id: callbackId, text }) 
    });
}
