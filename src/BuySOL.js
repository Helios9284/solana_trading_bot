require('dotenv').config();
const { swapJupyter, getTokenBalance, getTokenData } = require('./server-function');
const storage = require('node-persist');
const bs58 = require('bs58');
const { Wallet } = require('@project-serum/anchor');
const { Keypair } = require("@solana/web3.js");
const {TransactionDB} = require('../utils/transaction');

const SOL = "So11111111111111111111111111111111111111112";
storage.init();

let activeIntervals = {}
let intervalPiece = 0
const BuySOL = async (chatId, userName, bot, tokenAddress, buy_amount) => {
    let user_pri_key;

    await storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        user_pri_key = userWallet.privateKey;
    });
    let msgId = '';
    let txt = `Transaction sent. Waiting for confirmation...` +
        `If transaction is slow to confirm increase transaction priority in /settings and` +
        ` make sure you have enough sol to pay for the fee. Keep retrying, high fee doesnt guarantee inclusion.`
    bot.sendMessage(chatId, txt, { parse_mode: `HTML` }).then((msg) => {
        msgId = msg.message_id;
    });

    const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(user_pri_key)));

    try {
        const tokenBalance = await getTokenBalance(
            wallet.publicKey,
            tokenAddress,
        )

        let spl_amount;

        if (!tokenBalance) {
            spl_amount = 0
        } else {
            spl_amount = tokenBalance.amount;
        }
        let response = await swapJupyter(user_pri_key, SOL, tokenAddress, buy_amount * 1e9, 10);

        if (!response || !response.ok || !response.txid) {
            txt = "Transaction failed. Coundn't get a quote";
            bot.editMessageText(txt, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: "html",
            });
            return;
        }

        let intervalCounter = 0
        intervalPiece++
        const myInterCount = intervalPiece
        const interval = setInterval(async () => {
            console.log('Checking tokens received try', intervalCounter, 'out of', 10, 'tries for:', tokenAddress)

            intervalCounter++
            let tokenBalanceAfterSelling = await getTokenBalance(
                wallet.publicKey,
                tokenAddress,
            )
            let spl_afteramount;
            if (!tokenBalanceAfterSelling) {
                spl_afteramount = 0
            } else {
                spl_afteramount = tokenBalanceAfterSelling.amount;
            }

            if (spl_afteramount > spl_amount) {
                console.log('Tokens received, storing in the database')

                clearInterval(activeIntervals[myInterCount]);
                saveTransactionHistory(chatId, userName, SOL,response.txid, buy_amount,'Buy');
                txt = `Transaction confirmed!\nhttps://solscan.io/tx/${response.txid}`

                bot.editMessageText(txt, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: "html",
                });
            } else if (intervalCounter >= 25) {
                console.log("Enough tries, the token", tokenAddress, "wasn't detected.")

                clearInterval(activeIntervals[myInterCount])

                txt = "Transaction failed. Coundn't get a quote";
                bot.editMessageText(txt, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: "html",
                });
            }
        }, 3e3)
        activeIntervals[myInterCount] = interval
    } catch (error) {
        console.log('Tokens received, storing in the database')
        saveTransactionHistory(chatId, userName, SOL,'failed', buy_amount,'Buy');

        txt = "Transaction failed. Coundn't get a quote";
        bot.editMessageText(txt, {
            chat_id: chatId,
            message_id: msgId,
            parse_mode: "html",
        });
        return
    }
}

const saveTransactionHistory = async (userId, username, tokenAddress, txId, amount, type) => {
    const transactionData = new TransactionDB({
        userId,
        username,
        tokenAddress,
        txId,
        amount,
        timestamp: new Date().toISOString(),
        type
    });

    try {
        await transactionData.save();
        console.log('Transaction history saved:', transactionData);
    } catch (error) {
        console.error('Error saving transaction history:', error);
    }
};

module.exports = {
    BuySOL
}