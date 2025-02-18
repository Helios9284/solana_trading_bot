require('dotenv').config();

const storage = require('node-persist');

storage.init();

function help(chatId, bot) {
    const HELP_TEXT =
        "<b>Help:</b>\n\n" +
        "<b>Supported Tokens</b>\n" +
        "Which tokens can I trade?\n" +
        "You can trade Pino coin (meme coin on Solana) and SOL on the bot. The bot allows you to swap between Pino and SOL, with a fee on each transaction (2% fee for buy/sell transactions).\n\n" +
        "<b>Wallet Creation</b>\n" +
        "How do I create a wallet?\n" +
        "Click the Wallet button or type /wallet, and you will be able to configure your new wallets. Once you create a wallet, you will receive your unique wallet address to start trading.\n\n" +
        "<b>Trading Functionality</b>\n" +
        "How do I buy and sell Pino?\n" +
        "Buy Pino: /buy X SOL (e.g., /buy 10 SOL will buy Pino using 10 SOL). Sell Pino: /sell X Pino (e.g., /sell 100 Pino will sell 100 Pino for SOL).\n" +
        "Transaction Fee\n" +
        "2% Fee: A 2% fee is charged on each transaction (buy/sell), and this fee is burned by converting it into Pino coins and sending it to a burn wallet.\n\n" +
        "<b>Staking & Yield Farming</b>\n" +
        "How do I stake Pino?\n" +
        "To stake your Pino and earn rewards, use the /stake X Pino command. Example: /stake 500 Pino will stake 500 Pino and start generating rewards.\n" +
        "How can I withdraw my staked Pino?\n" +
        "Use /unstake X Pino to unstake your Pino and withdraw it. Example: /unstake 200 Pino will unstake 200 Pino.\n\n" +
        "<b>Staking & Yield Farming</b>\n" +
        "Why is my net profit lower than expected?\n" +
        "Net Profit is calculated after deducting all associated costs: Price Impact, Transfer, Tax, DEX Fees Bot Fee: 2% transaction fee. This ensures that the figure you see accurately reflects what you receive after all transaction-related expenses.\n\n";
        "<b>Transaction Monitoring</b>\n" +
        "What if one of the DEXes (Raydium, Orca, Jupiter) is slow or down? If one DEX is down or slow, you can always use another one to make your trades. All DEXes (Raydium, Orca, Jupiter) will give you access to the same wallet and positions.\n\n" +
        "<b>Risk Management Features</b>\n" + 
        "How do I set up stop-loss and take-profit orders?\n" + 
        "Use the following commands to manage your trades: /set_stop <percentage>: Set a stop-loss to automatically sell if the price drops by the specified percentage. Example: /set_stop 5 will set a 5% stop-loss on your trades. /take_profit <percentage>: Set a take-profit level to automatically sell when the price increases by the specified percentage. Example: /take_profit 10 will set a 10% take-profit. \n\n" +
        "<b>AI-Powered Trading Signals</b>\n" + 
        "What is the AI feature for trade signals?\n"+
        "The bot uses AI-powered algorithms to scan market trends and social sentiment, offering real-time trade suggestions. You’ll receive automated trade recommendations via Telegram, based on market conditions.\n\n" + 
        "<b>Subscription and Fees</b>\n" + 
        "Is the bot free? How much do I pay for transactions?\n"+
        "This bot is not free. We charge a 2% fee on transactions. Premium plans are available, which include AI signals, automation, and more. The fee is kept low to maintain a free-to-use bot with access to basic features for everyone.\n\n" +
        "<b> Support & Troubleshooting</b>\n" +
        "How can I get support?\n" + 
        "Use /support to get in touch with the bot's support team for any issues or troubleshooting needs. \n\n";

    bot.sendMessage(chatId, HELP_TEXT, {
        reply_markup: {
            inline_keyboard: [[{ text: "Close", callback_data: "close" }]],
        },
        parse_mode: "html",
    });
}

module.exports = {
    help
}