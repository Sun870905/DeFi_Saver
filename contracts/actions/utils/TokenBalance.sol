// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;
import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";

contract TokenBalance is ActionBase {
    using TokenUtils for address;

    struct Params {
        address tokenAddr;
        address holderAddr;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        return bytes32(inputData.tokenAddr.getBalance(inputData.holderAddr));
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function parseInputs(bytes[] memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData[0], (Params));
    }
}
