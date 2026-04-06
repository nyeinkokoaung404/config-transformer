///////////////////////////////////////////////
// Multi-Protocol Transformer Bot (Fixed)
// Developer: t.me/nkka404
// Version: 2.0
///////////////////////////////////////////////

// Bug list ကို callback_data အတွက် တိုတိုလေးပေးတာ ပိုစိတ်ချရပါတယ်
const BUGS = [
    { label: "Cloudflare (172.67.133.97)", ip: "172.67.133.97", id: "cf_bug" },
    { label: "Cloudfront (Amazon)", ip: "d12345.cloudfront.net", id: "amz_bug" },
    { label: "Mytel/MPT Bug", ip: "your.bug.com", id: "isp_bug" }
];

// MarkdownV2 escaping function
function escapeMarkdownV2(text) {
    const specialChars = /[_*[\]()~`>#+\-=|{}.!]/g;
    return text.replace(specialChars, '\\$&');
}

// Config ကို message ထဲက ထုတ်ယူခြင်း (ပိုမိုခိုင်မာသော နည်းလမ်း)
function extractConfigFromMessage(messageText) {
    if (!messageText) return null;
    
    const lines = messageText.split('\n');
    // နောက်ဆုံးကနေ စတင်ရှာဖွေပါ
    for (let i = lines.length - 1; i >= 0; i--) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith('vless://') || trimmed.startsWith('trojan://')) {
            return trimmed;
        }
    }
    return null;
}

// Config ကို transform လုပ်ခြင်း
function transformConfig(rawInput, bugAddress, env) {
    // Input validation
    if (!rawInput) {
        throw new Error("Raw config input is required");
    }
    if (!bugAddress) {
        throw new Error("Bug address is required");
    }
    
    try {
        const url = new URL(rawInput);
        const protocol = url.protocol.replace(':', '');
        
        // Protocol validation
        if (protocol !== 'vless' && protocol !== 'trojan') {
            throw new Error("Unsupported protocol: " + protocol);
        }
        
        const params = Object.fromEntries(url.searchParams);
        
        const originalHost = params.host || url.hostname;
        const auth = (protocol === 'vless') ? url.username : (url.password || url.username);
        const port = env.DEFAULT_PORT || "443";
        const path = params.path || '/';
        const remark = url.hash || '#Transform_404';
        
        const newParams = new URLSearchParams({
            path: path,
            security: "tls",
            encryption: "none",
            host: originalHost,
            fp: "chrome",
            type: "ws",
            sni: originalHost
        });
        
        return `${protocol}://${auth}@${bugAddress}:${port}?${newParams.toString()}${remark}`;
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error("Invalid URL format");
        }
        throw error;
    }
}

// Telegram message ပို့ခြင်း (ပိုမိုကောင်းမွန်သော version)
async function sendMessage(chatId, text, token, isMarkdown = false, keyboard = null) {
    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        
        // Telegram text length limit (4096 characters)
        const finalText = text.length > 4096 ? text.substring(0, 4093) + "..." : text;
        
        const payload = {
            chat_id: chatId,
            text: finalText,
        };
        
        if (isMarkdown) {
            payload.parse_mode = "MarkdownV2";
            payload.text = escapeMarkdownV2(finalText);
        }
        
        if (keyboard) {
            payload.reply_markup = JSON.stringify(keyboard);
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'Telegram Bot/1.0'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Telegram API error (${response.status}): ${errorText}`);
            throw new Error(`Telegram API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Send message failed:', error);
        throw error;
    }
}

// Keyboard ဖန်တီးခြင်း
function createBugKeyboard() {
    return {
        inline_keyboard: BUGS.map(bug => [
            { text: bug.label, callback_data: bug.id }
        ])
    };
}

// Help message
function getHelpMessage() {
    return `🤖 *404 Transformer Bot Help*

*Commands:*
/start - စတင်ရန်
/help - အကူအညီ

*အသုံးပြုပုံ:*
1\\. VLESS သို့မဟုတ် TROJAN link ကို ပို့ပါ
2\\. Bug တစ်ခုကို ရွေးချယ်ပါ
3\\. Transform လုပ်ထားသော config ကို ရယူပါ

*Supported protocols:*
• VLESS
• TROJAN

*Developer:* t\\.me/nkka404`;
}

// Main update handler
export async function handleUpdate(update, env) {
    const botToken = env.BOT_TOKEN;
    
    // Logging (optional - production အတွက်)
    if (env.DEBUG_MODE === 'true') {
        console.log('Received update:', JSON.stringify(update, null, 2));
    }
    
    // 1. Callback Query Handling (Button နှိပ်ခြင်းကို စစ်ဆေးခြင်း)
    if (update.callback_query) {
        const callbackData = update.callback_query.data;
        const chatId = update.callback_query.message.chat.id;
        const messageId = update.callback_query.message.message_id;
        
        // Answer callback query (loading indicator ပျောက်စေရန်)
        await answerCallbackQuery(update.callback_query.id, botToken);
        
        // Message ထဲမှာ ပါတဲ့ မူရင်း config ကို ရှာဖွေခြင်း
        const messageText = update.callback_query.message.text || "";
        const rawConfig = extractConfigFromMessage(messageText);
        
        const selectedBug = BUGS.find(b => b.id === callbackData);
        
        if (selectedBug && rawConfig) {
            try {
                const transformedConfig = transformConfig(rawConfig, selectedBug.ip, env);
                const escapedConfig = escapeMarkdownV2(transformedConfig);
                
                await sendMessage(
                    chatId, 
                    `✅ *Selected:* ${selectedBug.label}\n\n\`\`\`\n${escapedConfig}\n\`\`\``, 
                    botToken, 
                    true
                );
                
                // Optional: မူရင်း message ကို ပြင်ဆင်ရန် (ဘာတွေရွေးပြီးပြီဆိုတာ သိစေရန်)
                await editMessageReplyMarkup(chatId, messageId, null, botToken);
                
            } catch (e) {
                console.error('Transform error:', e);
                await sendMessage(
                    chatId, 
                    `❌ *Config ပြောင်းလဲရာတွင် အမှားအယွင်းရှိပါသည်။*\n\nError: ${e.message}`, 
                    botToken, 
                    true
                );
            }
        } else if (!rawConfig) {
            await sendMessage(
                chatId, 
                "❌ *Link ရှာမတွေ့တော့ပါ။ ကျေးဇူးပြု၍ VLESS/TROJAN link အသစ်ပြန်ပို့ပေးပါ။*", 
                botToken, 
                true
            );
        } else if (!selectedBug) {
            await sendMessage(
                chatId, 
                "❌ *Bug ရွေးချယ်မှု မမှန်ကန်ပါ။ ကျေးဇူးပြု၍ ပြန်ကြိုးစားပါ။*", 
                botToken, 
                true
            );
        }
        return;
    }
    
    // 2. Message Handling
    if (!update.message || !update.message.text) return;
    
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    
    // /start command
    if (text === '/start') {
        await sendMessage(
            chatId, 
            "🚀 *Welcome to 404 Transformer Bot!*\n\nVLESS သို့မဟုတ် TROJAN link ပို့ပေးပါ။\n\n/help ကိုနှိပ်ပြီး အကူအညီရယူနိုင်ပါတယ်။", 
            botToken, 
            true
        );
        return;
    }
    
    // /help command
    if (text === '/help') {
        await sendMessage(chatId, getHelpMessage(), botToken, true);
        return;
    }
    
    // Config link စစ်ဆေးခြင်း
    if (text.startsWith('vless://') || text.startsWith('trojan://')) {
        const keyboard = createBugKeyboard();
        
        // link ကို message ထဲ ပြန်ထည့်ပေးထားမှ callback က ပြန်ဖတ်လို့ရမှာပါ
        await sendMessage(
            chatId, 
            `🔍 *Bug တစ်ခုကို ရွေးချယ်ပေးပါ:*\n\n${text}`, 
            botToken, 
            true, 
            keyboard
        );
    } else {
        await sendMessage(
            chatId, 
            "⚠️ *VLESS သို့မဟုတ် TROJAN link သာ ပို့ပေးပါ။*\n\n/help ကိုနှိပ်ပြီး အသုံးပြုပုံကို လေ့လာနိုင်ပါတယ်။", 
            botToken, 
            true
        );
    }
}

// Answer callback query function
async function answerCallbackQuery(callbackQueryId, token) {
    try {
        const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
        const payload = {
            callback_query_id: callbackQueryId,
            text: "Processing...",
            show_alert: false
        };
        
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Answer callback query failed:', error);
    }
}

// Edit message reply markup function (keyboard ကိုဖျက်ရန်)
async function editMessageReplyMarkup(chatId, messageId, replyMarkup, token) {
    try {
        const url = `https://api.telegram.org/bot${token}/editMessageReplyMarkup`;
        const payload = {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: replyMarkup
        };
        
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Edit reply markup failed:', error);
    }
}

// Optional: Webhook setup function (Cloudflare Workers အတွက်)
export async function setWebhook(env) {
    const botToken = env.BOT_TOKEN;
    const webhookUrl = env.WEBHOOK_URL;
    
    if (!webhookUrl) {
        console.error('WEBHOOK_URL not set');
        return;
    }
    
    const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url: webhookUrl,
            allowed_updates: ["message", "callback_query"]
        })
    });
    
    const result = await response.json();
    console.log('Webhook setup:', result);
    return result;
}

// Cloudflare Workers entry point
export default {
    async fetch(request, env) {
        // Webhook verification (Telegram က ပို့တဲ့ request ကို လက်ခံရန်)
        if (request.method === 'POST') {
            try {
                const update = await request.json();
                await handleUpdate(update, env);
                return new Response('OK', { status: 200 });
            } catch (error) {
                console.error('Error handling update:', error);
                return new Response('Error', { status: 500 });
            }
        }
        
        // GET request handling (health check အတွက်)
        if (request.method === 'GET') {
            return new Response('Bot is running!', { 
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }
        
        return new Response('Method not allowed', { status: 405 });
    }
};
