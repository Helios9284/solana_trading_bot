require('dotenv').config;

const url = process.env.RPC_URL;
const axios = require("axios");
const Moralis = require("moralis").default;
const { SolNetwork } = require("@moralisweb3/common-sol-utils");

const get_Price = async (address) => {
    try{
        await Moralis.start({
            apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6Ijk1ZmZhZGYzLWUxZjUtNGNjNy04ZjRiLTk1MmJiY2Y4ZDcwOCIsIm9yZ0lkIjoiMjQ2NjA4IiwidXNlcklkIjoiMjQ5NTIwIiwidHlwZUlkIjoiYmU2MmMzN2YtYTQyNS00MjZiLWJiZDgtM2Y5NWRlZTgwMjczIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MTQ1NzE2NTIsImV4cCI6NDg3MDMzMTY1Mn0.CvvbyoF5A9Yc5XczBmu-VpYV1kRqbWSN16Ele-2WOdo"
          });

    const network = SolNetwork.MAINNET;

    const response = await Moralis.SolApi.token.getTokenPrice({
        address,
        network,
    });

    return response.toJSON();
} catch(error){
    console.log('error:', error);
    return 0;
}
};

/**
 * Fetches asset information for the given Solana address.
 *
 * @param {string} address - The Solana address to fetch asset information for.
 * @returns {Promise<any>} - The asset information for the given address.
 */
const get_info = async (address) => {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-KEY": process.env.BIRD_EYE_API_KEY,
            "x-chain": "solana"
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: "1",
            method: "getAsset",
            params: {
                id: address,
            },
        }),
    });
    const { result } = await response.json();
    return result;
};

/*const get_info = async (address) => {
    const response = await fetch(`https://public-api.birdeye.so/defi/token_overview?address=${address}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "X-API-KEY": process.env.BIRD_EYE_API_KEY,
            "x-chain": "solana"
        },
    });
    const { result } = await response.json();
    return result;
};
 */

const getTokenDetails = async (tokenAddress) => {
    try {
      const coingeckoResponse = await axios.get(
        `https://api.coingecko.com/api/v3/coins/solana/contract/${tokenAddress}`
      );
      const tokenImage = coingeckoResponse.data.image.large; 
      const name = coingeckoResponse.data.name;
      const symbol = coingeckoResponse.data.symbol;
      const totalSupply = coingeckoResponse.data.market_data.total_supply;
      return { name, symbol, totalSupply: totalSupply, tokenImage };
    } catch (error) {
      console.log("error:", error);
      return { name: "", symbol: "", totalSupply: 0, tokenImage: "" };
    }
  };

/**
 * Fetches the token accounts for the given Solana address.
 *
 * @param {string} address - The Solana address to fetch token accounts for.
 * @returns {Promise<any>} - The token accounts for the given address.
 */
const getTokenAccounts = async (address) => {
    const fetch = (await import("node-fetch")).default;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "getTokenAccounts",
            id: "1",
            params: {
                page: 1,
                limit: 100,
                displayOptions: {
                    showZeroBalance: false,
                },
                owner: address,
            },
        }),
    });

    const data = await response.json();

    return data.result;
};

module.exports = {
    getTokenAccounts,
    get_info,
    getTokenDetails,
    get_Price
}