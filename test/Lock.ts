import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers'
import { expect } from 'chai'
import hre from 'hardhat'
import { getAddress, parseEther } from 'viem'

describe('Lock', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployLockFixture() {
    const [owner, otherAccount] = await hre.viem.getWalletClients()
    const lock = await hre.viem.deployContract('Lock', [])
    const publicClient = await hre.viem.getPublicClient()

    return { lock, owner, otherAccount, publicClient }
  }

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { lock, owner } = await loadFixture(deployLockFixture)
      expect(await lock.read.owner()).to.equal(getAddress(owner.account.address))
    })
  })

  describe('Balance', function () {
    it('Should return the correct balance', async function () {
      const { lock, owner, otherAccount, publicClient } = await loadFixture(deployLockFixture)
      await otherAccount.sendTransaction({
        to: lock.address,
        value: parseEther('1.598')
      })
      expect(await publicClient.getBalance({ address: lock.address })).to.equal(parseEther('1.598'))
    })
  })

  describe('Deposit', function () {
    it('Should receive and store the funds', async function () {
      const { lock, otherAccount, publicClient } = await loadFixture(deployLockFixture)

      await otherAccount.sendTransaction({
        to: lock.address,
        value: parseEther('2')
      })

      expect(await publicClient.getBalance({ address: lock.address })).to.equal(parseEther('2'))
    })

    it('Should emit a Deposit event', async function () {
      const { lock, owner, otherAccount } = await loadFixture(deployLockFixture)
      await otherAccount.sendTransaction({
        to: lock.address,
        value: parseEther('1')
      })

      const depositEvents = await lock.getEvents.Deposit()

      expect(depositEvents).to.have.lengthOf(1)
      expect(depositEvents[0].args.from).to.equal(getAddress(otherAccount.account.address))
      expect(depositEvents[0].args.amount).to.equal(parseEther('1'))
    })
  })

  describe('Withdraw', function () {
    it('Should revert if called by non-owner', async function () {
      const { lock, otherAccount } = await loadFixture(deployLockFixture)
      const lockAsOtherAccount = await hre.viem.getContractAt('Lock', lock.address, {
        client: { wallet: otherAccount }
      })
      await expect(
        lockAsOtherAccount.write.withdraw([otherAccount.account.address, parseEther('1')])
      ).to.be.rejectedWith('Only owner can withdraw')
    })

    it('Should revert if balance is insufficient', async function () {
      const { lock, owner, otherAccount, publicClient } = await loadFixture(deployLockFixture)

      await otherAccount.sendTransaction({
        to: lock.address,
        value: parseEther('2')
      })

      const balance = await publicClient.getBalance({ address: lock.address })
      console.log('Initial contract balance:', balance.toString())

      await expect(
        lock.simulate.withdraw([owner.account.address, parseEther('2.938473984738473984731')])
      ).to.be.rejectedWith('Insufficient balance')
    })

    it('Should allow owner to withdraw', async function () {
      const { lock, owner, otherAccount, publicClient } = await loadFixture(deployLockFixture)
      await otherAccount.sendTransaction({
        to: lock.address,
        value: parseEther('3')
      })

      const balance_1 = await publicClient.getBalance({ address: lock.address })
      console.log('Balance_1:', balance_1.toString())

      await expect(lock.write.withdraw([owner.account.address, parseEther('3')])).to.be.fulfilled

      const balance_2 = await publicClient.getBalance({ address: lock.address })
      console.log('Balance_2:', balance_2.toString())

      expect(balance_2).to.equal(BigInt('0'))
    })

    it('Should emit a Withdrawal event', async function () {
      const { lock, owner } = await loadFixture(deployLockFixture)
      await owner.sendTransaction({
        to: lock.address,
        value: parseEther('1')
      })

      await lock.write.withdraw([owner.account.address, parseEther('1')])

      const withdrawalEvents = await lock.getEvents.Withdrawal()
      expect(withdrawalEvents).to.have.lengthOf(1)
      expect(withdrawalEvents[0].args.to).to.equal(getAddress(owner.account.address))
      expect(withdrawalEvents[0].args.amount).to.equal(parseEther('1'))
    })
  })
})
