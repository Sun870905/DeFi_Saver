const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
    setNewExchangeWrapper,
    fetchAmountinUSDPrice,
} = require('../utils');

const {
    buy,
} = require('../actions.js');

// TODO: check stuff like price and slippage
// TODO: can we make it work with 0x?

describe('Dfs-Buy', function () {
    this.timeout(40000);

    let senderAcc; let proxy; let uniWrapper; let
        kyberWrapper; let uniV3Wrapper;

    const trades = [
        {
            sellToken: 'WETH', buyToken: 'DAI', sellAmount: fetchAmountinUSDPrice('WETH', '5000'), buyAmount: fetchAmountinUSDPrice('DAI', '1000'), fee: 3000,
        },
        {
            sellToken: 'DAI', buyToken: 'WBTC', sellAmount: fetchAmountinUSDPrice('DAI', '5000'), buyAmount: fetchAmountinUSDPrice('WBTC', '1000'), fee: 3000,
        },
        {
            sellToken: 'WETH', buyToken: 'USDC', sellAmount: fetchAmountinUSDPrice('WETH', '5000'), buyAmount: fetchAmountinUSDPrice('USDC', '1000'), fee: 3000,
        },
        {
            sellToken: 'USDC', buyToken: 'WETH', sellAmount: fetchAmountinUSDPrice('USDC', '5000'), buyAmount: fetchAmountinUSDPrice('WETH', '1000'), fee: 3000,
        },
        {
            sellToken: 'WETH', buyToken: 'USDT', sellAmount: fetchAmountinUSDPrice('WETH', '5000'), buyAmount: fetchAmountinUSDPrice('USDT', '1000'), fee: 3000,
        },
        {
            sellToken: 'DAI', buyToken: 'USDC', sellAmount: fetchAmountinUSDPrice('DAI', '5000'), buyAmount: fetchAmountinUSDPrice('USDC', '1000'), fee: 500,
        },
    ];

    before(async () => {
        await redeploy('DFSBuy');
        uniWrapper = await redeploy('UniswapWrapperV3');
        kyberWrapper = await redeploy('KyberWrapperV3');
        uniV3Wrapper = await redeploy('UniV3WrapperV3');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
        await setNewExchangeWrapper(senderAcc, kyberWrapper.address);
        await setNewExchangeWrapper(senderAcc, uniV3Wrapper.address);
    });

    for (let i = 0; i < trades.length; ++i) {
        const trade = trades[i];

        it(`... should buy ${trade.buyAmount} ${trade.buyToken} with ${trade.sellToken}`, async () => {
            const sellAddr = getAssetInfo(trade.sellToken).address;
            const buyAddr = getAssetInfo(trade.buyToken).address;

            const buyBalanceBefore = await balanceOf(buyAddr, senderAcc.address);
            const proxySellBalanceBefore = await balanceOf(sellAddr, proxy.address);
            const proxyBuyBalanceBefore = await balanceOf(buyAddr, proxy.address);

            const sellAmount = hre.ethers.utils.parseUnits(
                trade.sellAmount,
                getAssetInfo(trade.sellToken).decimals,
            );
            const buyAmount = hre.ethers.utils.parseUnits(
                trade.buyAmount,
                getAssetInfo(trade.buyToken).decimals,
            );

            await buy(
                proxy,
                sellAddr,
                buyAddr,
                sellAmount,
                buyAmount,
                uniWrapper.address,
                senderAcc.address,
                senderAcc.address,
            );

            const buyBalanceAfter = await balanceOf(buyAddr, senderAcc.address);
            const proxySellBalanceAfter = await balanceOf(sellAddr, proxy.address);
            const proxyBuyBalanceAfter = await balanceOf(buyAddr, proxy.address);

            expect(proxyBuyBalanceBefore).to.be.eq(proxyBuyBalanceAfter, 'Check if we left over buy token on proxy');
            expect(proxySellBalanceBefore).to.be.eq(proxySellBalanceAfter, 'Check if we left over sell token on proxy');

            // because of the eth gas fee
            if (getAssetInfo(trade.buyToken).symbol !== 'ETH') {
                expect(buyBalanceBefore.add(buyAmount)).is.eq(buyBalanceAfter, 'Check if we got that exact amount');
            } else {
                expect(buyBalanceAfter).is.gt(buyBalanceBefore, 'Check if we got that exact amount');
            }
        });
    }
    for (let i = 0; i < trades.length; ++i) {
        const trade = trades[i];
        it(`... should buy ${trade.buyAmount} ${trade.buyToken} with ${trade.sellToken} on uniswap v3`, async () => {
            const sellAddr = getAssetInfo(trade.sellToken).address;
            const buyAddr = getAssetInfo(trade.buyToken).address;

            const buyBalanceBefore = await balanceOf(buyAddr, senderAcc.address);
            const proxySellBalanceBefore = await balanceOf(sellAddr, proxy.address);
            const proxyBuyBalanceBefore = await balanceOf(buyAddr, proxy.address);

            const sellAmount = hre.ethers.utils.parseUnits(
                trade.sellAmount,
                getAssetInfo(trade.sellToken).decimals,
            );
            const buyAmount = hre.ethers.utils.parseUnits(
                trade.buyAmount,
                getAssetInfo(trade.buyToken).decimals,
            );

            await buy(
                proxy,
                sellAddr,
                buyAddr,
                sellAmount,
                buyAmount,
                uniV3Wrapper.address,
                senderAcc.address,
                senderAcc.address,
                trade.fee,
            );

            const buyBalanceAfter = await balanceOf(buyAddr, senderAcc.address);
            const proxySellBalanceAfter = await balanceOf(sellAddr, proxy.address);
            const proxyBuyBalanceAfter = await balanceOf(buyAddr, proxy.address);

            expect(proxyBuyBalanceBefore).to.be.eq(proxyBuyBalanceAfter, 'Check if we left over buy token on proxy');
            expect(proxySellBalanceBefore).to.be.eq(proxySellBalanceAfter, 'Check if we left over sell token on proxy');

            // because of the eth gas fee
            if (getAssetInfo(trade.buyToken).symbol !== 'ETH') {
                expect(buyBalanceBefore.add(buyAmount)).is.eq(buyBalanceAfter, 'Check if we got that exact amount');
            } else {
                expect(buyBalanceAfter).is.gt(buyBalanceBefore, 'Check if we got that exact amount');
            }
        });
    }
});
