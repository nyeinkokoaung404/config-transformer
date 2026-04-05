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
        await sendMessage(chatId, "Welcome to 404 Transformer Bot! 🚀\n\nLink ကို ပို့ပေးပါ။ မူရင်း Host ကို SNI အဖြစ်သုံးပြီး Bug IP နဲ့ ပြောင်းလဲပေးပါမယ်။", botToken);
        return;
    }

    // Config Link စစ်ဆေးခြင်း
    if (text.startsWith('vless://') || text.startsWith('trojan://')) {
        try {
            const transformedConfig = transformConfig(text, env);
            const message = "✅ *Transformation Success!*\n\n`" + transformedConfig + "`";
            await sendMessage(chatId, message, botToken, true);
        } catch (e) {
            await sendMessage(chatId, "❌ Invalid Config Format or Error!", botToken);
        }
    }
}

function transformConfig(rawInput, env) {
    const url = new URL(rawInput);
    const protocol = url.protocol.replace(':', '');
    const params = Object.fromEntries(url.searchParams);
    
    // ၁။ User ပေးပို့လိုက်တဲ့ Original Host ကို ရယူခြင်း (ဒါကို SNI နဲ့ Host အတွက် သုံးပါမယ်)
    const originalHost = url.hostname; 
    
    // ၂။ Authentication (UUID or Password)
    const auth = (protocol === 'vless') ? url.username : (url.password || url.username);
    
    // ၃။ Remark/Name (Hash)
    const hash = url.hash || '#Transform_404';

    // ၄။ Bug Address (Cloudflare IP or Bug Domain) 
    // Env ထဲမှာ မရှိရင် Default IP တစ်ခု သတ်မှတ်ထားပေးပါ
    const bugAddress = env.BUG_ADDRESS || "172.67.133.97";
    const port = env.DEFAULT_PORT || "443";

    // ၅။ Construct New Config
    // SNI နဲ့ Host နေရာမှာ စောစောက ရယူထားတဲ့ originalHost ကို သုံးထားပါတယ်
    const path = params.path || '/';
    
    // Build parameters
    const newParams = new URLSearchParams({
        path: path,
        security: 'tls',
        encryption: 'none',
        host: originalHost,
        type: 'ws',
        sni: originalHost,
        fp: 'chrome',
        alpn: 'http/1.1'
    });

    return `${protocol}://${auth}@${bugAddress}:${port}?${newParams.toString()}${hash}`;
}

async function sendMessage(chatId, text, token, isMarkdown = false) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: isMarkdown ? "Markdown" : ""
    };

    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}
