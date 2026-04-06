///////////////////////////////////////////////
// Multi-Protocol Transformer Bot (Multi-Bug)
// Developer: t.me/nkka404
///////////////////////////////////////////////

const BUGS = [
    { label: "Cloudflare (172.67.133.97)", ip: "172.67.133.97" },
    { label: "Cloudfront (Amazon)", ip: "d12345.cloudfront.net" },
    { label: "DigitalOcean IP", ip: "104.248.xx.xx" },
    { label: "Custom Bug (Mytel/MPT)", ip: "your.bug.com" }
];

export async function handleUpdate(update, env) {
    const botToken = env.BOT_TOKEN;

    // Callback Query (Button နှိပ်တာကို စစ်ဆေးခြင်း)
    if (update.callback_query) {
        const callbackData = update.callback_query.data;
        const chatId = update.callback_query.message.chat.id;
        const messageText = update.callback_query.message.text;

        // Message ထဲကနေ မူရင်း config ကို ပြန်ရှာခြင်း
        const rawConfig = messageText.split('\n').pop().trim();
        const selectedBug = BUGS.find(b => b.label === callbackData);

        if (selectedBug && (rawConfig.startsWith('vless://') || rawConfig.startsWith('trojan://'))) {
            try {
                const transformedConfig = transformConfig(rawConfig, selectedBug.ip, env);
                const escapedConfig = transformedConfig.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
                
                await sendMessage(chatId, `✅ *Selected: ${selectedBug.label}*\n\n\`\`\`${escapedConfig}\`\`\``, botToken, true);
            } catch (e) {
                await sendMessage(chatId, "❌ *Error transforming config!*", botToken);
            }
        }
        return;
    }

    if (!update.message || !update.message.text) return;

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();

    if (text === '/start') {
        await sendMessage(chatId, "Welcome to 404 Transformer! 🚀\n\nVless/Trojan Link ပို့ပေးပါ။", botToken);
        return;
    }

    if (text.startsWith('vless://') || text.startsWith('trojan://')) {
        // Bug ရွေးချယ်ဖို့ Keyboard ပြခြင်း
        const keyboard = {
            inline_keyboard: BUGS.map(bug => [{ text: bug.label, callback_data: bug.label }])
        };
        
        await sendMessage(chatId, `🔍 *Bug တစ်ခုကို ရွေးချယ်ပေးပါ:*\n\n${text}`, botToken, true, keyboard);
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

    // URLSearchParams သုံးပြီး ပိုသန့်ရှင်းအောင် တည်ဆောက်ခြင်း
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

    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}
