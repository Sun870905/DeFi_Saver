/* eslint-disable no-await-in-loop */
const { expect } = require('chai');
const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    LOGGER_ADDR,
    UNIV3POSITIONMANAGER_ADDR,
    balanceOf,
    fetchAmountinUSDPrice,
} = require('../../utils');

const {
    uniV3Mint,
} = require('../../actions.js');

describe('Uni-Mint-V3', () => {
    let senderAcc; let proxy; let logger; let positionManager;

    const uniPairs = [
        {
            tokenA: 'DAI',
            tokenB: 'WETH',
            amount0: fetchAmountinUSDPrice('DAI', '1000'),
            amount1: fetchAmountinUSDPrice('WETH', '1000'),
            fee: '3000',
            tickLower: '-92100',
            tickUpper: '-69060',
        },
        {
            tokenA: 'DAI',
            tokenB: 'USDC',
            amount0: fetchAmountinUSDPrice('DAI', '1000'),
            amount1: fetchAmountinUSDPrice('WETH', '1000'),
            fee: '500',
            tickLower: '-120',
            tickUpper: '120',
        },
        {
            tokenA: 'WBTC',
            tokenB: 'WETH',
            amount0: fetchAmountinUSDPrice('WBTC', '1000'),
            amount1: fetchAmountinUSDPrice('WETH', '1000'),
            fee: '3000',
            tickLower: '-120',
            tickUpper: '120',
        },
    ];

    before(async () => {
        await redeploy('UniMintV3');
        logger = await hre.ethers.getContractAt('DefisaverLogger', LOGGER_ADDR);
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        positionManager = await hre.ethers.getContractAt('IUniswapV3NonfungiblePositionManager', UNIV3POSITIONMANAGER_ADDR);
    });

    for (let i = 0; i < uniPairs.length; i++) {
        it(`... should mint a ${uniPairs[i].tokenA}/${uniPairs[i].tokenB} position to uniswap V3`, async () => {
            const tokenDataA = await getAssetInfo(uniPairs[i].tokenA);
            const tokenDataB = await getAssetInfo(uniPairs[i].tokenB);
            const startingProxyBalanceTokenA = await balanceOf(tokenDataA.address, proxy.address);
            const startingProxyBalanceTokenB = await balanceOf(tokenDataB.address, proxy.address);
            const numberOfPositionsBefore = await positionManager.balanceOf(senderAcc.address);

            const from = senderAcc.address;
            const to = senderAcc.address;
            const amount0 = hre.ethers.utils.parseUnits(uniPairs[i].amount0, tokenDataA.decimals);
            const amount1 = hre.ethers.utils.parseUnits(uniPairs[i].amount1, tokenDataB.decimals);
            await uniV3Mint(proxy, tokenDataA.address,
                tokenDataB.address, uniPairs[i].fee, uniPairs[i].tickLower,
                uniPairs[i].tickUpper, amount0, amount1, to, from);

            const numberOfPositionsAfter = await positionManager.balanceOf(senderAcc.address);
            expect(numberOfPositionsAfter.toNumber())
                .to.be.equal(numberOfPositionsBefore.toNumber() + 1);
            const lastPositionIndex = numberOfPositionsBefore.toNumber();
            const tokenId = positionManager.tokenOfOwnerByIndex(to, lastPositionIndex);
            const position = await positionManager.positions(tokenId);
            // confirming that position representng our mint is the same as parameters we put into
            expect(position.token0.toLowerCase()).to.be.equal(tokenDataA.address.toLowerCase());
            expect(position.token1.toLowerCase()).to.be.equal(tokenDataB.address.toLowerCase());
            expect(position.fee).to.be.equal(parseInt(uniPairs[i].fee, 10));
            expect(position.tickLower).to.be.equal(parseInt(uniPairs[i].tickLower, 10));
            expect(position.tickUpper).to.be.equal(parseInt(uniPairs[i].tickUpper, 10));
            expect(await balanceOf(tokenDataA.address, proxy.address))
                .to.be.eq(startingProxyBalanceTokenA);
            expect(await balanceOf(tokenDataB.address, proxy.address))
                .to.be.eq(startingProxyBalanceTokenB);
        }).timeout(50000);
    }
    it('... should Log event', async () => {
        const i = 0;
        const tokenDataA = getAssetInfo(uniPairs[i].tokenA);
        const tokenDataB = getAssetInfo(uniPairs[i].tokenB);

        const from = senderAcc.address;
        const to = senderAcc.address;
        const amount0 = hre.ethers.utils.parseUnits(uniPairs[i].amount0, tokenDataA.decimals);
        const amount1 = hre.ethers.utils.parseUnits(uniPairs[i].amount1, tokenDataB.decimals);
        await expect(uniV3Mint(proxy, tokenDataA.address,
            tokenDataB.address, uniPairs[i].fee, uniPairs[i].tickLower,
            uniPairs[i].tickUpper, amount0, amount1, to, from))
            .to.emit(logger, 'LogEvent');
    }).timeout(50000);
});
