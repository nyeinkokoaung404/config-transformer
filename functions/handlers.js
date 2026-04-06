///////////////////////////////////////////////
// Multi-Protocol Transformer Bot (Fixed)
// Developer: t.me/nkka404
///////////////////////////////////////////////

// Bug list ကို callback_data အတွက် တိုတိုလေးပေးတာ ပိုစိတ်ချရပါတယ်
const BUGS = [
    { label: "Cloudflare (172.67.133.97)", ip: "172.67.133.97", id: "cf_bug" },
    { label: "Cloudfront (Amazon)", ip: "d12345.cloudfront.net", id: "amz_bug" },
    { label: "Mytel/MPT Bug", ip: "your.bug.com", id: "isp_bug" }
];

export async function handleUpdate(update, env) {
    const botToken = env.BOT_TOKEN;

    // 1. Callback Query Handling (Button နှိပ်ခြင်းကို စစ်ဆေးခြင်း)
    if (update.callback_query) {
        const callbackData = update.callback_query.data;
        const chatId = update.callback_query.message.chat.id;
        
        // Message ထဲမှာ ပါတဲ့ မူရင်း config ကို ရှာဖွေခြင်း
        const messageText = update.callback_query.message.text || "";
        const lines = messageText.split('\n');
        const rawConfig = lines[lines.length - 1].trim(); // နောက်ဆုံးစာကြောင်းက link လို့ ယူဆတယ်

        const selectedBug = BUGS.find(b => b.id === callbackData);

        if (selectedBug && (rawConfig.startsWith('vless://') || rawConfig.startsWith('trojan://'))) {
            try {
                const transformedConfig = transformConfig(rawConfig, selectedBug.ip, env);
                const escapedConfig = transformedConfig.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
                
                await sendMessage(chatId, `✅ *Selected:* ${selectedBug.label}\n\n\`\`\`${escapedConfig}\`\`\``, botToken, true);
            } catch (e) {
                await sendMessage(chatId, "❌ *Config ပြောင်းလဲရာတွင် အမှားအယွင်းရှိပါသည်။*", botToken);
            }
        } else {
            await sendMessage(chatId, "❌ *Link ရှာမတွေ့တော့ပါ။ ကျေးဇူးပြု၍ ပြန်ပို့ပေးပါ။*", botToken);
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

    // Config link စစ်ဆေးခြင်း
    if (text.startsWith('vless://') || text.startsWith('trojan://')) {
        const keyboard = {
            inline_keyboard: BUGS.map(bug => [
                { text: bug.label, callback_data: bug.id } // id ကို သုံးပြီး callback လုပ်မယ်
            ])
        };
        
        // link ကို message ထဲ ပြန်ထည့်ပေးထားမှ callback က ပြန်ဖတ်လို့ရမှာပါ
        await sendMessage(chatId, `🔍 *Bug တစ်ခုကို ရွေးချယ်ပေးပါ:*\n\n${text}`, botToken, false, keyboard);
    } else {
        await sendMessage(chatId, "⚠️ *VLESS သို့မဟုတ် TROJAN link သာ ပို့ပေးပါ။*", botToken);
    }
}

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
