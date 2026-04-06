///////////////////////////////////////////////
// Multi-Protocol Transformer Bot (Final Fix)
// Developer: t.me/nkka404
///////////////////////////////////////////////

// ID တွေကို အတိုဆုံး (cf, amz, isp) လို့ပဲ ပေးပါမယ် (Limit 64 bytes ကျော်မသွားအောင်)
const BUGS = [
    { label: "Cloudflare", ip: "172.67.133.97", id: "cf" },
    { label: "Cloudfront", ip: "d12345.cloudfront.net", id: "amz" },
    { label: "Mytel/MPT Bug", ip: "104.26.14.196", id: "isp" }
];

export async function handleUpdate(update, env) {
    const botToken = env.BOT_TOKEN;

    // 1. Callback Query Handling
    if (update.callback_query) {
        const callbackData = update.callback_query.data;
        const chatId = update.callback_query.message.chat.id;
        const messageId = update.callback_query.message.message_id;
        
        // Message ထဲကနေ Link ကို ရှာဖွေခြင်း (Regex သုံးပြီး Link သီးသန့် ဆွဲထုတ်မယ်)
        const messageText = update.callback_query.message.text || "";
        const configMatch = messageText.match(/(vless|trojan):\/\/[^\s]+/);
        const rawConfig = configMatch ? configMatch[0] : null;

        const selectedBug = BUGS.find(b => b.id === callbackData);

        if (selectedBug && rawConfig) {
            try {
                const transformedConfig = transformConfig(rawConfig, selectedBug.ip, env);
                // MarkdownV2 အတွက် Special Characters တွေကို Escape လုပ်ခြင်း
                const escapedConfig = transformedConfig.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
                
                await sendMessage(chatId, `✅ *Selected:* ${selectedBug.label}\n\n\`\`\`${escapedConfig}\`\`\``, botToken, true);
                
                // ခလုတ်နှိပ်ပြီးရင် Loading circle လေး ပျောက်သွားအောင် အကြောင်းပြန်ပေးရပါမယ်
                await answerCallback(update.callback_query.id, botToken);
            } catch (e) {
                await sendMessage(chatId, "❌ *Error during transformation!*", botToken);
            }
        } else {
            await sendMessage(chatId, "❌ *Link Expired or Not Found!* ကျေးဇူးပြု၍ Link ပြန်ပို့ပေးပါ။", botToken);
        }
        return;
    }

    // 2. Message Handling
    if (!update.message || !update.message.text) return;

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();

    if (text === '/start') {
        await sendMessage(chatId, "Welcome to 404 Transformer! 🚀\n\nVless/Trojan Link ပို့ပေးပါ။", botToken);
        return;
    }

    if (text.startsWith('vless://') || text.startsWith('trojan://')) {
        const keyboard = {
            inline_keyboard: BUGS.map(bug => [
                { text: bug.label, callback_data: bug.id } // ID အတိုလေးတွေပဲ ပို့မယ်
            ])
        };
        
        // Markdown ကြောင့် Error မတက်အောင် link ပြတဲ့နေရာမှာ parse_mode မသုံးဘဲ ပို့ပါမယ်
        await sendMessage(chatId, `🔍 *Bug တစ်ခုကို ရွေးချယ်ပေးပါ:*\n\n${text}`, botToken, false, keyboard);
    }
}

// Config ပြောင်းလဲပေးသည့် Function
function transformConfig(rawInput, bugAddress, env) {
    const url = new URL(rawInput);
    const protocol = url.protocol.replace(':', '');
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
}

// Telegram API: Send Message
async function sendMessage(chatId, text, token, isMarkdown = false, keyboard = null) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: text,
    };
    if (isMarkdown) payload.parse_mode = "MarkdownV2";
    if (keyboard) payload.reply_markup = JSON.stringify(keyboard);

    return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

// Telegram API: Answer Callback (Loading အဝိုင်းလေး ပျောက်စေရန်)
async function answerCallback(callbackId, token) {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId })
    });
}
