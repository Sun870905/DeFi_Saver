const { expect } = require('chai');
const hre = require('hardhat');

const {
    impersonateAccount,
    stopImpersonatingAccount,
    sendEther,
    redeploy,
    ADMIN_ACC,
} = require('../utils.js');

describe('Admin-Vault', () => {
    let notOwner; let adminAcc; let adminVault; let
        newOwner; let newAdminAcc;

    before(async () => {
        adminVault = await redeploy('AdminVault');

        adminAcc = await hre.ethers.provider.getSigner(ADMIN_ACC);

        notOwner = (await hre.ethers.getSigners())[0];
        newOwner = (await hre.ethers.getSigners())[1];
        newAdminAcc = (await hre.ethers.getSigners())[2];

        await sendEther(newOwner, ADMIN_ACC, '1');
    });

    it('... should change the owner address', async () => {
        await impersonateAccount(ADMIN_ACC);

        const adminVaultByAdmin = adminVault.connect(adminAcc);
        await adminVaultByAdmin.changeOwner(newOwner.address);
        const currOwner = await adminVaultByAdmin.owner();

        await stopImpersonatingAccount(ADMIN_ACC);

        expect(currOwner).to.eq(newOwner.address);
    });

    it('... should fail to change the owner address if not called by admin', async () => {
        await expect(adminVault.changeAdmin(newOwner.address)).to.be.revertedWith('msg.sender not admin');
    });

    it('... should change the admin address', async () => {
        await impersonateAccount(ADMIN_ACC);

        const adminVaultByAdmin = adminVault.connect(adminAcc);
        await adminVaultByAdmin.changeAdmin(newAdminAcc.address);
        const currAdmin = await adminVaultByAdmin.admin();

        await stopImpersonatingAccount(ADMIN_ACC);

        expect(currAdmin).to.eq(newAdminAcc.address);
    });

    it('... should fail to change the admin address if not called by admin', async () => {
        try {
            await adminVault.changeAdmin(notOwner.address);
            // eslint-disable-next-line no-unused-expressions
            expect(true).to.be.false;
        } catch (err) {
            expect(err.toString()).to.have.string('msg.sender not admin');
        }
    });
});
