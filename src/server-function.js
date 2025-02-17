require('dotenv').config();

const web3 = require("@solana/web3.js")
const { Connection, Keypair } = require("@solana/web3.js")
const fsPromises = require("fs/promises")
const bs58 = require("bs58")
const path = require("path")
const { Wallet } = require("@project-serum/anchor")
const { Metaplex, amount } = require('@metaplex-foundation/js')
const {
    jsonInfo2PoolKeys,
    Liquidity,
    TokenAmount,
    Token,
    Percent,
    TOKEN_PROGRAM_ID,
    SPL_ACCOUNT_LAYOUT,
    TxVersion,
} = require("@raydium-io/raydium-sdk")
const SOL = "So11111111111111111111111111111111111111112"

const getRPC = () => {
    const rpc = process.env.RPC_URL;
    return rpc
}

// Returns all the tokens you have including token, uiAmount, amount, decimals
const getAllTokensBalance = async (ownerPublicKey) => {
    console.log(ownerPublicKey);
    const connection = new Connection(getRPC())
    const tokenAccs = await connection.getParsedTokenAccountsByOwner(
        ownerPublicKey,
        { programId: TOKEN_PROGRAM_ID },
    )
    const tokensNonZeroBalance = tokenAccs.value
        .filter((item) => {
            return item.account.data.parsed.info.tokenAmount.uiAmount != 0
        })
        .map((item) => {
            return {
                token: item.account.data.parsed.info.mint,
                uiAmount: item.account.data.parsed.info.tokenAmount.uiAmount,
                amount: item.account.data.parsed.info.tokenAmount.amount,
                decimals: item.account.data.parsed.info.tokenAmount.decimals,
            }
        })
    return tokensNonZeroBalance
}

// Returns null if that token found
const getTokenBalance = async (ownerPublicKey, tokenToTarget) => {
    const tokensNonZeroBalance = await getAllTokensBalance(ownerPublicKey)
    let selectedTokenBalance = tokensNonZeroBalance.find((item) => {
        return item.token.toLowerCase() == tokenToTarget.toLowerCase()
    })
    if (!selectedTokenBalance) return null
    return selectedTokenBalance
}

// Returns all the positions formatted with profits and unrealizedProfits which are calculated from the remaining balance the user has

let activeIntervals = {}
let intervalPiece = 0

const sellToken = async (tokenAddress, percentageToSell, user_pri_key, maxSlippagePercentage) => {
    console.log('> Selling token called <')
    const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(user_pri_key)));

    try {
        const tokenBalance = await getTokenBalance(
            wallet.publicKey,
            tokenAddress,
        )
        if (!tokenBalance) return { ok: false, msg: "Token balance not found" }
        const amountToSell = (tokenBalance.amount * percentageToSell) / 100
        const response = await swapJupyter(
            user_pri_key,
            tokenAddress,
            SOL,
            amountToSell,
            maxSlippagePercentage,
        )

        if (!response || !response.ok || !response.txid) {
            console.log("Coundn't get a quote, stopping")
            return { ok: false };
        }

        let intervalCounter = 0
        intervalPiece++
        const myInterCount = intervalPiece
        const intervalSell = setInterval(async () => {
            console.log("Selling interval check", intervalCounter, 'out of', 21, 'tries')
            intervalCounter++
            tokenBalanceAfterSelling = await getTokenBalance(
                wallet.publicKey,
                tokenAddress,
            )
            // Token has been sold
            if (!tokenBalanceAfterSelling || tokenBalanceAfterSelling.amount < tokenBalance.amount) {
                clearInterval(activeIntervals[myInterCount])
                return { ok: true, txid: response.txid }
            } else if (intervalCounter >= 21) {
                console.log("Enough tries, no sell detected. Stopping.")
                clearInterval(activeIntervals[myInterCount])
                return { ok: false, msg: "Error processing the trade send again" }
            }
        }, 3e3)
        // Mapping where the key is the address
        activeIntervals[myInterCount] = intervalSell
    } catch (e) {
        console.log("Error selling token", e)
        return { ok: false, msg: "Error processing the trade send again" }
    }
}





// Slippage is defined in bps which means 100 is 1% so we gotta multiply by 100
const getAmountOutJupyter = async (tokenA, tokenB, amount, slippage) => {
    // const url = `https://quote-api.jup.ag/v6/quote?inputMint=${tokenA}&outputMint=${tokenB}&amount=${Number(amount).toFixed(0)}&slippageBps=${slippage * 100}`
    const url = `https://jupiter-swap-api.quiknode.pro/543C9C08EE2B/quote?inputMint=${tokenA}&outputMint=${tokenB}&amount=${Number(amount).toFixed(0)}&slippageBps=${slippage * 100}`
    console.log(url);
    let quote = null
    try {
        quote = await (await fetch(url)).json()
        if (!quote) {
            console.error("unable to quote")
            return null
        }
    } catch (e) {
        console.log("Error getting quote", e)
        return null
    }
    return quote
}

const getTokenDataJupyter = async (token) => {
    try {
        const tokenData = JSON.parse(
            await fsPromises.readFile(
                path.join(__dirname, "tokens-data.json"),
                "utf-8",
            ),
        )
        console.log('tokenData', tokenData)
        const found = tokenData.find(
            (data) => token.toLowerCase() == data.address.toLowerCase(),
        )
        return found || null
    } catch (e) {
        console.log("failed to read the file for the token data")
        return null
    }
}

const getTokenData = async tokenAddress => {
    const connection = new Connection(getRPC())
    const metaplex = Metaplex.make(connection)
    const mintAddress = new web3.PublicKey(tokenAddress)
    const tokenData = await metaplex.nfts().findByMint({ mintAddress })
    // We only return what we need, there's more data there
    return {
        decimals: tokenData.mint.decimals,
        symbol: tokenData.json.symbol,
    }
}

const swapJupyter = async (privateKey, tokenA, tokenB, amount, slippage) => {
    console.log("starting swap...")
    console.log(
        "swapping:",
        amount,
        "of",
        tokenA,
        "for token:",
        tokenB,
        "with slippage:",
        slippage,
    )

    let txid = null
    let tokenData = null
    let amountOut = null
    let quote = null

    const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(privateKey)))
    const connection = new Connection(getRPC())

    console.log('1')
    try {
        quote = await getAmountOutJupyter(tokenA, tokenB, amount, slippage)
        if (!quote || quote.error) {
            if (quote.error) console.log('quote response:', quote.error)
            return { ok: false }
        }
        amountOut = quote.outAmount
        if (!amountOut) {
            console.log("quote", quote)
            return { ok: false }
        }
    } catch (e) {
        console.log("Error getting quote", e)
        return { ok: false }
    }
    console.log('2')
    try {
        // get serialized transaction
        const swapResult = await (
            await fetch("https://quote-api.jup.ag/v6/swap", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    quoteResponse: quote,
                    userPublicKey: wallet.publicKey.toString(),
                    dynamicComputeUnitLimit: true, // allow dynamic compute limit instead of max 1,400,000
                    prioritizationFeeLamports: "auto", // or custom lamports: 1000
                }),
            })
        ).json()

        // submit transaction
        const swapTransactionBuf = Buffer.from(
            swapResult.swapTransaction,
            "base64",
        )
        let transaction = web3.VersionedTransaction.deserialize(swapTransactionBuf)
        transaction.sign([wallet.payer])
        const rawTransaction = transaction.serialize()
        txid = await connection.sendRawTransaction(rawTransaction, {
            maxRetries: 30,
            skipPreflight: false, // If you set this to true, you can skip the next one.
            preflightCommitment: "processed",
        })
        // const signature = await web3.sendAndConfirmRawTransaction(connection, rawTransaction, [wallet.payer]);

        console.log(`https://solscan.io/tx/${txid}`)

        tokenData = await getTokenData(
            tokenA.toLowerCase() == SOL.toLowerCase() ? tokenB : tokenA,
        )
        console.log(tokenData);
    } catch (e) {
        console.log("error: ", e.toString())
        // console.log("Transaction didnt confirm in 60 seconds (it is still valid)")
        // The transaction may fail because it didn't confirm in 1 minute but 99% of the times it works a bit later
    }

    return {
        txid,
        ok: true,
        solSpent: amount,
        tokensReceived: amountOut,
        ...tokenData,
    }

}

module.exports = {
    sellToken,
    getAllTokensBalance,
    getTokenBalance,
    swapJupyter,
    getTokenDataJupyter,
    getTokenData,
    getRPC,
}
