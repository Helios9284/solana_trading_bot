const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const storage = require('node-persist');

const generateRandomNumber = () => {
    return Math.floor(100000 + Math.random() * 900000); // Generates a random 6-digit number
};

const setup2FA = async (chatId, bot) => {

    const randomNumber = generateRandomNumber();

    await storage.setItem(`2FASecret_${chatId}`, randomNumber);

    const qrCodeImageBuffer = await QRCode.toBuffer(randomNumber.toString());
    bot.sendPhoto(chatId, qrCodeImageBuffer, { caption: "Add this code manually to your authenticator app, then enter the generated code below." });
};

module.exports = {
    setup2FA
}