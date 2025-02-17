require('dotenv').config();

const web3 = require('@solana/web3.js');
const storage = require('node-persist');
const base58 = require('bs58');
const connection = new web3.Connection(process.env.RPC_URL);
storage.init();

/**
 * Displays the user's Solana wallet information, including the public key, balance, and provides various wallet management options.
 *
 * @param {number} chatId - The chat ID of the user.
 * @param {object} bot - The Telegram bot instance.
 * @param {number} [msgId] - The message ID of the existing wallet message, if any.
 * @returns {Promise<void>} - Resolves when the wallet message is sent or updated.
 */
const Wallet = async (chatId, bot, msgId) => {
    let user_pub_key;
    try{

    await storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        user_pub_key = userWallet.publicKey;
    });

    const balance = await connection.getBalance(new web3.PublicKey(user_pub_key));
    const walletbalance = balance / web3.LAMPORTS_PER_SOL;

    const txt =
        `<b>Your Wallet:</b> \n\nAddress : <code>${user_pub_key}</code>\n` +
        `Balance : <b>${walletbalance}</b> SOL \n\n Tap to copy the address and send SOL to deposit.`;

    const wallet_markup = {
        inline_keyboard: [
            [
                {
                    text: "View on Solscan",
                    url: "https://solscan.io/account/" + user_pub_key,
                },
                { text: "Close", callback_data: "close" },
            ],
            [{ text: "Deposit SOL", callback_data: "deposit" }],
            [
                { text: "Withdraw all SOL", callback_data: "withdrawall" },
                { text: "Withdraw X SOL", callback_data: "withdraw" },
            ],
            [
                { text: "Reset Wallet", callback_data: "resetwallet" },
                { text: "Export Private Key", callback_data: "exportpk" },
            ],
            [{ text: "Refresh", callback_data: "refresh_wallet" }],
        ],
    };
    if (!msgId) {
        bot.sendMessage(chatId, txt, {
            reply_markup: wallet_markup,
            parse_mode: "html",
        });
    } else {
        bot.editMessageText(txt, {
            chat_id: chatId,
            message_id: msgId,
            reply_markup: wallet_markup,
            parse_mode: "html",
        });
    }
}catch(error){
    console.log("error:", error);
}
};

module.exports = {
    Wallet
}