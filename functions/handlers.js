///////////////////////////////////////////////
// Multi-Protocol Transformer Bot
// Developer: t.me/nkka404
///////////////////////////////////////////////

export async function handleUpdate(update, env) {
    if (!update.message || !update.message.text) return;

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const botToken = env.BOT_TOKEN;

    if (text === '/start') {
        await sendMessage(chatId, "*Welcome to 404 Config Transformer Bot!* 🚀\n\nVless-Trojan Link ကို ပို့ပေးပါ။ မူရင်း Config link ကို အခြေခံပြီး Transform လုပ်ပေးပါမည်။", botToken);
        return;
    }

    // Config format စစ်ဆေးခြင်း (Vless/Trojan)
    if (text.startsWith('vless://') || text.startsWith('trojan://')) {
        try {
            const transformedConfig = transformConfig(text, env);
            
            const escapedConfig = transformedConfig.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
            
            await sendMessage(chatId, `✅ *Transformation Success\\!*\n\n\`\`\`${escapedConfig}\`\`\``, botToken, true);
        } catch (e) {
            await sendMessage(chatId, "❌ *Invalid Config Format or Host not found!*", botToken);
        }
    } else {
        await sendMessage(chatId, "⚠️ *VLESS သို့မဟုတ် TROJAN link သာ ပို့ပေးပါ။*", botToken);
    }
}

function transformConfig(rawInput, env) {
    const url = new URL(rawInput);
    const protocol = url.protocol.replace(':', '');
    const params = Object.fromEntries(url.searchParams);
    
    const originalHost = params.host || url.hostname;
    
    if (!originalHost) throw new Error("Host not found");

    const auth = (protocol === 'vless') ? url.username : (url.password || url.username);
    const remark = url.hash || '#Transform_404';

    const bugAddress = env.BUG_ADDRESS || "172.67.133.97"; // Target IP/Bug
    const port = env.DEFAULT_PORT || "443";
    const path = params.path || '/';

    const newConfig = `${protocol}://${auth}@${bugAddress}:${port}?path=${encodeURIComponent(path)}&security=tls&alpn=http%2F1.1&encryption=none&host=${originalHost}&fp=chrome&type=ws&sni=${originalHost}${remark}`;

    return newConfig;
}

async function sendMessage(chatId, text, token, isMarkdown = false) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: text,
    };
    
    if (isMarkdown) {
        payload.parse_mode = "MarkdownV2";
    }

    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}
