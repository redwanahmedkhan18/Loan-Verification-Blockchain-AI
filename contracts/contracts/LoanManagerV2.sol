// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILoanNFT {
    function mint(address to) external returns (uint256);
    function nextTokenId() external view returns (uint256);
}

contract LoanManagerV2 is AccessControl, Pausable {
    bytes32 public constant OFFICER_ROLE = keccak256("OFFICER_ROLE");
    bytes32 public constant PAUSER_ROLE  = keccak256("PAUSER_ROLE");

    IERC20   public immutable stable;
    ILoanNFT public immutable loanNFT;

    struct Loan {
        address borrower;
        uint256 principal;
        uint16  aprBps;          // 1200 = 12%
        uint16  durationMonths;  // e.g. 12
        string  metaURI;
        uint256 tokenId;
        bool    active;
        uint64  createdAt;
    }

    mapping(uint256 => Loan) public loans;

    event LoanMinted(
        uint256 indexed tokenId,
        address indexed borrower,
        uint256 principal,
        uint16  aprBps,
        uint16  durationMonths,
        string  metaURI
    );

    constructor(address stable_, address loanNFT_, address admin_) {
        stable = IERC20(stable_);
        loanNFT = ILoanNFT(loanNFT_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(OFFICER_ROLE,        admin_);
        _grantRole(PAUSER_ROLE,         admin_);
    }

    function pause()   external onlyRole(PAUSER_ROLE) { _pause();   }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    function mintLoan(
        address borrower,
        uint256 principal,
        uint16  aprBps,
        uint16  durationMonths,
        string  calldata metaURI
    )
        external
        whenNotPaused
        onlyRole(OFFICER_ROLE)
        returns (uint256 tokenId)
    {
        tokenId = loanNFT.mint(borrower);

        loans[tokenId] = Loan({
            borrower:       borrower,
            principal:      principal,
            aprBps:         aprBps,
            durationMonths: durationMonths,
            metaURI:        metaURI,
            tokenId:        tokenId,
            active:         true,
            createdAt:      uint64(block.timestamp)
        });

        emit LoanMinted(tokenId, borrower, principal, aprBps, durationMonths, metaURI);
    }

    function getLoan(uint256 tokenId) external view returns (Loan memory) {
        return loans[tokenId];
    }

    function nextLoanId() external view returns (uint256) {
        return loanNFT.nextTokenId();
    }
}
