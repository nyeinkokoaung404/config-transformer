///////////////////////////////////////////////
// Multi-Protocol Transformer Bot
// Developer: t.me/nkka404
///////////////////////////////////////////////

export async function handleUpdate(update, env) {
    const botToken = env.BOT_TOKEN;
    const kv = env.STATE_KV; // KV binding

    if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text.trim();

        // ၁။ Start Command
        if (text === '/start') {
            await sendMessage(chatId, "Welcome to 404 Config Transformer Bot! 🚀\n\nVless (သို့မဟုတ်) Trojan Config Link ကို ပို့ပေးပါ။ မူရင်း Config link ကို အခြေခံပြီး Transform လုပ်ပေးပါမည်။", botToken);
            return;
        }

        // ၂။ User က Custom Bug Address ရိုက်ပို့လာတာကို စစ်ဆေးခြင်း
        // KV ထဲမှာ ဒီ User ရဲ့ Config သိမ်းထားသလား အရင်ကြည့်မယ်
        const savedConfig = await kv.get(`user_${chatId}`);
        if (savedConfig && !text.startsWith('vless://') && !text.startsWith('trojan://')) {
            try {
                const transformed = transformConfig(savedConfig, text, env);
                const escapedConfig = transformed.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
                
                await sendMessage(chatId, `✅ *Custom Transform Success\\!*\nHost: \`${text}\`\n\n\`\`\`${escapedConfig}\`\`\``, botToken, true);
                
                // အလုပ်ပြီးရင် KV ထဲက data ကို ဖျက်လိုက်မယ်
                await kv.delete(`user_${chatId}`);
                return;
            } catch (e) {
                await sendMessage(chatId, "❌ Error: Transform လုပ်ရာတွင် အမှားအယွင်းရှိပါသည်။", botToken);
                return;
            }
        }

        // ၃။ Config Link အသစ် ပို့လာခြင်း
        if (text.startsWith('vless://') || text.startsWith('trojan://')) {
            await sendBugSelection(chatId, text, botToken);
        } else {
            await sendMessage(chatId, "⚠️ *VLESS သို့မဟုတ် TROJAN link သာ ပို့ပေးပါ။*", botToken, true);
        }
    }

    // ၄။ ခလုတ်နှိပ်လိုက်တဲ့အခါ (Callback Query)
    if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const chatId = callbackQuery.message.chat.id;
        const [action, config] = callbackQuery.data.split('|');

        if (action === 'default') {
            const bug = env.BUG_ADDRESS || "172.67.133.97";
            const transformed = transformConfig(config, bug, env);
            const escapedConfig = transformed.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
            await editMessage(chatId, callbackQuery.message.message_id, `✅ *Default Success\\!*\n\n\`\`\`${escapedConfig}\`\`\``, botToken);
        } 
        else if (action === 'ask_custom') {
            // KV ထဲမှာ User ရဲ့ Config ကို ၁၀ မိနစ်စာ ခဏသိမ်းထားမယ်
            await kv.put(`user_${chatId}`, config, { expirationTtl: 600 });
            
            await editMessage(chatId, callbackQuery.message.message_id, "⌨️ *အသုံးပြုလိုသော Custom Bug Address ကို ရိုက်ပို့ပေးပါ...*\n(ဥပမာ: mpt.com.mm သို့မဟုတ် IP address)", botToken);
        }
    }
}

// ခလုတ်ပြသရန်
async function sendBugSelection(chatId, config, token) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: "အသုံးပြုလိုသော Bug Address ကို ရွေးချယ်ပါ 👇",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "☁️ Default Bug", callback_data: `default|${config}` },
                    { text: "✏️ Custom Bug", callback_data: `ask_custom|${config}` }
                ]
            ]
        }
    };
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

function transformConfig(rawInput, bugAddress, env) {
    const url = new URL(rawInput);
    const protocol = url.protocol.replace(':', '');
    const params = Object.fromEntries(url.searchParams);
    const originalHost = params.host || url.hostname;
    const auth = (protocol === 'vless') ? url.username : (url.password || url.username);
    const remark = url.hash || '#Transform_404';
    const port = env.DEFAULT_PORT || "443";
    const path = params.path || '/';

    return `${protocol}://${auth}@${bugAddress}:${port}?path=${encodeURIComponent(path)}&security=tls&alpn=http%2F1.1&encryption=none&host=${originalHost}&fp=chrome&type=ws&sni=${originalHost}${remark}`;
}

async function sendMessage(chatId, text, token, isMarkdown = false) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: isMarkdown ? "MarkdownV2" : "" }) });
}

async function editMessage(chatId, messageId, text, token) {
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "MarkdownV2" }) });
}
