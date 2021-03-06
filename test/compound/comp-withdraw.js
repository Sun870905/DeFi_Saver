const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo, compoundCollateralAssets } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
} = require('../utils');

const {
    supplyComp,
    withdrawComp,
} = require('../actions');

describe('Comp-Withdraw', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    before(async () => {
        await redeploy('CompWithdraw');
        await redeploy('DFSSell');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < compoundCollateralAssets.length; ++i) {
        const cTokenData = compoundCollateralAssets[i];
        if (cTokenData.symbol === 'cWBTC Legacy') {
            // Jump over WBTC Legacy
            // eslint-disable-next-line no-continue
            continue;
        }

        const fetchedAmountWithUSD = fetchAmountinUSDPrice(cTokenData.underlyingAsset, '1000');
        it(`... should withdraw ${fetchedAmountWithUSD} ${cTokenData.underlyingAsset} from Compound`, async () => {
            const assetInfo = getAssetInfo(cTokenData.underlyingAsset);
            const cToken = cTokenData.address;

            if (assetInfo.symbol === 'REP') return;

            if (assetInfo.symbol === 'ETH') {
                assetInfo.address = WETH_ADDRESS;
            }

            const amount = hre.ethers.utils.parseUnits(
                fetchedAmountWithUSD,
                assetInfo.decimals,
            );

            await supplyComp(proxy, cToken, assetInfo.address, amount, senderAcc.address);

            const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

            await withdrawComp(proxy, cToken, amount, senderAcc.address);

            const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);

            expect(balanceAfter).to.be.gt(balanceBefore);
        });
    }
});
