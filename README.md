

## Getting Started

First, run the development server:

```bash
npm run start


```
## Features
1. User Onboarding and Security Setup
• Wallet Creation: On issuance of the “/start” command, the bot will
automatically create a wallet for the user and display the wallet address.
• 2FA and Secure Access: The bot will implement two-factor
authentication (2FA) along with additional security measures to ensure safe
account access.
• Subscription Plan Selection:
• Free Tier: Provides basic trading with manual buy/sell functions.
• Premium Plans: Include access to AI trading, automation, staking
rewards, and enhanced features.
2. SOL Deposit Monitoring
• The bot will monitor deposits by tracking when a user sends SOL to
their wallet address.
3. Buy/Sell Functionality
• Users will initially use SOL to purchase coins and later sell coins.
• A fee of 2% on each swap (buy/sell) will be automatically deducted
from the user’s buy amount and transferred to the Admin Wallet.
4. Fee Management & Token Burn Mechanism
• Instead of converting coins to Token with every transaction (to
minimize gas consumption), the 2% fee is transferred to the Admin Wallet.
• A separate script (to be developed) will later track and convert coins
in the Admin Wallet into SOL, purchase Token, and execute a burn transaction in
batches.
TELEGRAM TRADING BOT DEVELOPMENT AGREEMENT
• The Client acknowledges that the Admin Wallet owner (or
associated automated script) will manage these transactions and bear any
associated fees.
5. User Activity Tracking
• All user transactions and activity will be recorded in a database,
which may later be used for leaderboards and statistical analysis.
