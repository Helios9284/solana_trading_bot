require('dotenv').config();

const coinTicker = require('coin-ticker');
const web3 = require('@solana/web3.js');
const storage = require('node-persist');
const { get_info, getTokenAccounts, get_Price } = require('./Helius');
const connection = new web3.Connection(process.env.RPC_URL);

storage.init();

/**
 * Sells a token on the Solana blockchain.
 *
 * @param {number} chatId - The chat ID of the user.
 * @param {object} bot - The Telegram bot instance.
 * @param {object} data - The token data, including the token accounts.
 * @param {number} count - The index of the token account to sell.
 * @returns {Promise<void>} - A promise that resolves when the sell operation is complete.
 */
const sell = async (chatId, bot, data, count, msgId) => {
    let user_pub_key;
    let user_Wallet;
    await storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        user_pub_key = userWallet.publicKey;
        user_Wallet = userWallet;
    });

    const balance = await connection.getBalance(new web3.PublicKey(user_pub_key));
    const walletbalance = balance / web3.LAMPORTS_PER_SOL;

    const tokenAddress = data.token_accounts[count].mint;

    const token_info = await get_info(tokenAddress);
    const tick = await coinTicker("bitfinex", "SOL_USD");

    const tokenAmount = data.token_accounts[count].amount / 10 ** token_info.token_info.decimals;

    let price;

    if (!token_info.token_info.price_info) {
        const t_price = await get_Price(tokenAddress);
        price = t_price.usdPrice;
    } else {
        const sol_info = await get_info("So11111111111111111111111111111111111111112");

        price = (tick.last / sol_info.token_info.price_info.price_per_token) * token_info.token_info.price_info.price_per_token;
    }

    const name = token_info.content.metadata.name;
    const symbol = token_info.content.metadata.symbol;
    const market_cap =
        (token_info.token_info.supply * price) /
        1e6 /
        10 ** token_info.token_info.decimals;
    const value = price * tokenAmount;
    const sol_value = value / tick.last;

    const sell_mark = {
        inline_keyboard: [
            [
                { text: "Home", callback_data: "home" },
                { text: "Close", callback_data: "close" },
            ],
            [
                {
                    text: `Buy ${user_Wallet.settings.buyleftset} SOL`,
                    callback_data: "sell_buyleft",
                },
                {
                    text: `Buy ${user_Wallet.settings.buyrightset} SOL`,
                    callback_data: "sell_buyright",
                },
                { text: "Buy X SOL", callback_data: "sell_buyx" },
            ],
            [
                { text: `<< Prev`, callback_data: "sell_token_prev" },
                { text: `${symbol}`, callback_data: "symbol" },
                { text: "Next >>", callback_data: "sell_token_next" },
            ],
            [
                {
                    text: `Sell ${user_Wallet.settings.sellleftset} %`,
                    callback_data: "sellleft",
                },
                {
                    text: `Sell ${user_Wallet.settings.sellrightset} %`,
                    callback_data: "sellright",
                },
                { text: `Sell X %`, callback_data: "sellx" },
            ],
            [
                { text: "Explorer", url: "https://solscan.io/account/" + tokenAddress },
                { text: "Birdeye", url: "https://birdeye.so/token/" + tokenAddress },
            ],
            [{ text: "Refresh", callback_data: "Sell_refresh" }],
        ],
    };

    const text =
        `${name} | <b>${symbol}</b> |\n<code>${tokenAddress}</code>\n\n` +
        `Value: <b>$${value.toFixed(2)}</b> / <b>${sol_value.toFixed(
            4
        )} SOL</b>\n` +
        `Mcap: <b>$${market_cap.toFixed(2)}M</b> @ <b>$${price.toFixed(4)}</b>\n` +
        `5m: <b>-1.06%</b>, 1h: <b>-0.18%</b>, 6h: <b>-0.12%</b>, 24h: <b>+13.62%</b>\n\n` +
        `Balance: <b>${tokenAmount.toFixed(2)} ${symbol}</b>\n` +
        `Wallet Balance: <b>${walletbalance.toFixed(5)} SOL</b>\n`;

    if (!msgId) {
        bot.sendMessage(chatId, text, {
            reply_markup: sell_mark,
            parse_mode: "html",
        });
    } else {
        bot.editMessageText(text, {
            chat_id: chatId,
            message_id: msgId,
            reply_markup: sell_mark,
            parse_mode: "html",
        });
    }
}

module.exports = {
    sell
}