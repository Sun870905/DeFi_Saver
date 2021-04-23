const { expect } = require('chai');
const hre = require('hardhat'); 

const {
    getProxy,
    redeploy,
} = require('../utils');

const {
    safeCount,
    fetchReflexerAddresses,
    lastSafeID,
    getSafeInfo,
    ADAPTER_ADDRESS,
} = require('../utils-reflexer');

const {
    reflexerOpen
} = require('../actions.js');


describe('Reflexer-Open', () => {
    let senderAcc; let proxy; let reflexerView;

    before(async () => {
        await redeploy('ReflexerOpen');
        reflexerView = await redeploy('RaiLoanInfo');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    })

    it('... should open 5 empty Reflexer Safes', async () => {

        let safeCountBefore = await safeCount(proxy.address);
        for (let i = 0; i < 5; i++){
            await reflexerOpen(proxy, ADAPTER_ADDRESS);
            let safeCountAfter = await safeCount(proxy.address);
            expect(safeCountAfter - 1).to.be.equal(safeCountBefore);
            safeCountBefore = safeCountAfter;

            const safeID = await lastSafeID(proxy.address);
            const info = await getSafeInfo(reflexerView, safeID); 
            expect(info.coll.toNumber()).to.be.equal(0);
            expect(info.debt.toNumber()).to.be.equal(0);

        }
    }).timeout(50000);
})