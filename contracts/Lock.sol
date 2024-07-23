// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import { ERC721 } from '@openzeppelin/contracts/token/ERC721/ERC721.sol';

contract Lock {
  address public owner;

  event Deposit(address indexed from, uint amount);
  event Withdrawal(address indexed to, uint amount);

  constructor() {
    owner = msg.sender;
  }

  receive() external payable {
    emit Deposit(msg.sender, msg.value);
  }

  function withdraw(address payable to, uint amount) external {
    require(msg.sender == owner, 'Only owner can withdraw');
    require(address(this).balance >= amount, 'Insufficient balance');

    (bool success, ) = to.call{ value: amount }('');
    require(success, 'Transfer failed');
    emit Withdrawal(to, amount);
  }

  function getBalance() public view returns (uint) {
    return address(this).balance;
  }

  function isOwner(address account) public view returns (bool) {
    return account == owner;
  }
}
