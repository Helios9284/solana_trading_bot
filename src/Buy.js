require('dotenv').config();

const coinTicker = require('coin-ticker');
const web3 = require('@solana/web3.js');
const storage = require('node-persist');
const { get_info,getTokenDetails,  get_Price } = require('./Helius');
const connection = new web3.Connection(process.env.RPC_URL);

storage.init();

async function buy(chatId, bot, tokenAddress, msgId) {
    try{
    let user_pub_key;
    let user_Wallet;
    await storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        user_pub_key = userWallet.publicKey;
        user_Wallet = userWallet;
    });

    const balance = await connection.getBalance(new web3.PublicKey(user_pub_key));
    const walletbalance = balance / web3.LAMPORTS_PER_SOL;

    const token_info = await get_info(tokenAddress);
    let price;

    if (!token_info.token_info.price_info) {
        const t_price = await get_Price(tokenAddress);
        price = t_price.usdPrice;
    } else {
        const sol_info = await get_info("So11111111111111111111111111111111111111112");

        const tick = await coinTicker("bitfinex", "SOL_USD");
        price = (tick.last / sol_info.token_info.price_info.price_per_token) * token_info.token_info.price_info.price_per_token;
    }

    const name = token_info.content.metadata.name;
    const symbol = token_info.content.metadata.symbol;
    const market_cap = (token_info.token_info.supply * price) / 1e6 / 10 ** token_info.token_info.decimals;

    const text =
        `${name} | <b>${symbol}</b> |\n<code>${tokenAddress}</code>\n\n` +
        `Price : <b>$${price.toFixed(5)}</b>\n` +
        `5m: <b>+0.61</b>%, 1h: <b>+19.11</b>%, 6h: <b>+50.55</b>%, 24h: <b>+75.60</b>%\n` +
        `Market Cap : <b>$${market_cap.toFixed(2)}M</b>\n\n` +
        `Price Impact (1 SOL) : <b>${((1 - price / price) * 100).toFixed(
            2
        )}%</b>\n\n` +
        `Wallet Balance : <b>${walletbalance} SOL</b>\n` +
        `To buy press one of the buttons below.`;
    const buy_markup = {
        inline_keyboard: [
            [{ text: "Cancel", callback_data: "close" }],
            [
                { text: "Explorer", url: "https://solscan.io/account/" + tokenAddress },
                { text: "Birdeye", url: "https://birdeye.so/token/" + tokenAddress },
            ],
            [
                {
                    text: `Buy ${user_Wallet.settings.buyleftset} SOL`,
                    callback_data: "buyleft",
                },
                {
                    text: `Buy ${user_Wallet.settings.buyrightset} SOL`,
                    callback_data: "buyright",
                },
                { text: "Buy X SOL", callback_data: "buyx" },
            ],
            [{ text: "Refresh", callback_data: "refresh_buy" }],
        ],
    };
    if (!msgId) {
        bot.sendMessage(chatId, text, {
            reply_markup: buy_markup,
            parse_mode: "html",
        });
    } else {
        bot.editMessageText(text, {
            chat_id: chatId,
            message_id: msgId,
            reply_markup: buy_markup,
            parse_mode: "html",
        });
    }
} catch(error){
    console.log("errror:", error);
    bot.sendMessage(chatId, 'Wrong Tokenaddress');
}
}

module.exports = {
    buy
}