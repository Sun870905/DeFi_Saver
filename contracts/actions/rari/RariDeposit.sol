// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "../../interfaces/IERC20.sol";
import "../../interfaces/rari/IFundManager.sol";

/// @title Deposits a stablecoin into Rari stable pool and receive RPT (rari pool token) in return
contract RariDeposit is ActionBase, DSMath {
    using TokenUtils for address;

    struct Params {
        address fundManager;
        address stablecoinAddress;
        address poolTokenAddress;
        uint256 amount;
        address from;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.amount = _parseParamUint(
            inputData.amount,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);

        uint256 rsptReceived = _rariDeposit(inputData, false);
        return bytes32(rsptReceived);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        _rariDeposit(inputData, true);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////
    function _rariDeposit(Params memory _inputData, bool isActionDirect)
        internal
        returns (uint256 rsptReceived)
    {
        require(_inputData.to != address(0), "Can't send to burn address");
        IFundManager rariFundManager = IFundManager(_inputData.fundManager);

        _inputData.amount = _inputData.stablecoinAddress.pullTokensIfNeeded(
            _inputData.from,
            _inputData.amount
        );

        _inputData.stablecoinAddress.approveToken(address(rariFundManager), _inputData.amount);
        uint256 poolTokenBalanceBefore;

        if (!isActionDirect) {
            poolTokenBalanceBefore = _inputData.poolTokenAddress.getBalance(_inputData.to);
        }
        rariFundManager.depositTo(
            _inputData.to,
            IERC20(_inputData.stablecoinAddress).symbol(),
            _inputData.amount
        );

        if (!isActionDirect) {
            uint256 poolTokenBalanceAfter = _inputData.poolTokenAddress.getBalance(_inputData.to);
            rsptReceived = sub(poolTokenBalanceAfter, poolTokenBalanceBefore);
        }
        /// @dev rsptReceived will be 0 if action was called directly, money deposited can be recevied with _inputData.amount
        logger.Log(address(this), msg.sender, "RariDeposit", abi.encode(_inputData, rsptReceived));
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
