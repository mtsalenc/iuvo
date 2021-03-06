const IuvoCore = artifacts.require('./IuvoCore.sol')
const PausableProxy = artifacts.require('./PausableProxy.sol')
const IuvoCoreV2 = artifacts.require('./mock/IuvoCoreV2.sol')
const { expectThrow } = require('../helpers/utils')

contract('IuvoCore', function (accounts) {
  const owner = accounts[0]
  const ratingOracle = accounts[1]
  const doctorA = accounts[9]
  const doctorB = accounts[8]
  const patientA = accounts[7]

  let pausableProxy
  let iuvoCoreByProxy
  let iuvoCore

  const deployContracts = async () => {
    iuvoCore = await IuvoCore.new()
    pausableProxy = await PausableProxy.new(iuvoCore.address)
    iuvoCoreByProxy = IuvoCore.at(pausableProxy.address)
    await iuvoCoreByProxy.initialize()

    await iuvoCoreByProxy.setRatingOracle(ratingOracle, { from: owner })
  }

  const deployMockDoctor = async (iuvoCoreByProxy, doctorAccount) => {
    await iuvoCoreByProxy.setDoctor(
      'Dr. Nancy',
      'Love taking care of people',
      'QmcSD36n81qTdHWCiHoFt1jiVpcW1eZoHJALFbBJxYRhLf',
      'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
      { from: doctorAccount }
    )
  }

  // This section tests core contract functionality
  describe('Doctor CRUD operations', () => {
    beforeEach(deployContracts)

    // All function calls should go through the proxy and be forwarded to the target
    // contract. A user should be able to add himself as a doctor.
    it('should allow adding doctors through proxy', async () => {
      let doctorExists = await iuvoCoreByProxy.doctorExists(doctorA)
      let doctorCount = (await iuvoCoreByProxy.doctorsArrayLength()).toNumber()

      assert.isFalse(doctorExists, 'doctor should not be present yet')
      assert.equal(doctorCount, 0, 'there should be no doctors')

      await deployMockDoctor(iuvoCoreByProxy, doctorA)

      doctorExists = await iuvoCoreByProxy.doctorExists(doctorA)
      doctorCount = (await iuvoCoreByProxy.doctorsArrayLength()).toNumber()

      assert.isTrue(doctorExists, 'doctor should be present')
      assert.equal(doctorCount, 1, 'there should be a doctor')
    })

    // Users should also be able to update their data through the proxy.
    it('should allow editing doctors through proxy', async () => {
      await iuvoCoreByProxy.setDoctor(
        'Dr. Nanct', // simulating typo error
        'Love taking care of people',
        'QmcSD36n81qTdHWCiHoFt1jiVpcW1eZoHJALFbBJxYRhLf',
        'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
        { from: doctorA }
      )

      const doctorPosition = (await iuvoCoreByProxy.doctorPosition.call(doctorA)).toNumber()
      let doctorData = await iuvoCoreByProxy.doctors.call(doctorPosition) // fetch the saved doctor

      assert.equal(doctorData[0], 'Dr. Nanct', 'should have saved the data correctly')

      await iuvoCoreByProxy.setDoctor(
        'Dr. Nancy',
        'Love taking care of people',
        'QmcSD36n81qTdHWCiHoFt1jiVpcW1eZoHJALFbBJxYRhLf',
        'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
        { from: doctorA }
      )

      doctorData = await iuvoCoreByProxy.doctors.call(doctorPosition)
      assert.equal(doctorData[0], 'Dr. Nancy', 'should have updated the data correctly')
    })

    // Users should be able to delete their doctor profile under normal conditions.
    it('should allow deleting doctors through proxy', async () => {
      await deployMockDoctor(iuvoCoreByProxy, doctorA)

      let doctorExists = await iuvoCoreByProxy.doctorExists(doctorA)
      assert.isTrue(doctorExists, 'doctor should be present')
      let doctorCount = (await iuvoCoreByProxy.doctorsArrayLength()).toNumber()
      assert.equal(doctorCount, 1, 'there should be a doctor')

      await iuvoCoreByProxy.deleteDoctor({ from: doctorA })

      doctorExists = await iuvoCoreByProxy.doctorExists(doctorA)
      assert.isFalse(doctorExists, 'doctor should be marked as deleted')
    })
  })

  // Users should be able to hire doctors.
  describe('Appointments', () => {
    beforeEach(deployContracts)

    it('should allow patients to hire doctors', async () => {
      let numberOfAppointments = (await iuvoCoreByProxy.appointmentsLength()).toNumber()
      assert.equal(numberOfAppointments, 0, 'there should be no appointments yet')

      await deployMockDoctor(iuvoCoreByProxy, doctorA)

      await iuvoCoreByProxy.hireDoctor(
        doctorA,
        'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
        0x0,
        'https://kleros.io',
        100,
        0x0,
        { from: patientA }
      )

      numberOfAppointments = (await iuvoCoreByProxy.appointmentsLength()).toNumber()
      assert.equal(numberOfAppointments, 1, 'there should be an appointment')
    })
  })

  // This section tests circuit breaks and function calls when the contract is paused.
  describe('Circuit breaks and acess control', () => {
    beforeEach(deployContracts)

    it('should not allow calling functions when paused', async () => {
      await iuvoCoreByProxy.pause()

      await expectThrow(
        iuvoCoreByProxy.setDoctor(
          'Dr. Nanct',
          'Love taking care of people',
          'QmcSD36n81qTdHWCiHoFt1jiVpcW1eZoHJALFbBJxYRhLf',
          'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
          { from: doctorA }
        )
      )

      await iuvoCoreByProxy.unpause()

      await iuvoCoreByProxy.setDoctor(
        'Dr. Nanct',
        'Love taking care of people',
        'QmcSD36n81qTdHWCiHoFt1jiVpcW1eZoHJALFbBJxYRhLf',
        'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
        { from: doctorA }
      )

      await iuvoCoreByProxy.pause()

      await expectThrow(
        iuvoCoreByProxy.setRating(doctorA, '5.0', { from: doctorA })
      )

      await expectThrow(
        iuvoCoreByProxy.deleteDoctor({ from: doctorA })
      )

      await expectThrow(
        iuvoCoreByProxy.setDoctor(
          'Dr. Nanct',
          'Love taking care of people',
          'QmcSD36n81qTdHWCiHoFt1jiVpcW1eZoHJALFbBJxYRhLf',
          'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
          { from: doctorB }
        )
      )
      await expectThrow(
        iuvoCoreByProxy.hireDoctor(
          doctorA,
          'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
          0x0,
          'https://kleros.io',
          100,
          0x0,
          { from: patientA }
        )
      )
    })

    // User access to the setRating should be restricted to the oracle.
    it('should only the ratingOracle to set the doctors rating', async () => {
      await deployMockDoctor(iuvoCoreByProxy, doctorA)

      const doctorPosition = (await iuvoCoreByProxy.doctorPosition.call(doctorA)).toNumber()
      let doctorData = await iuvoCoreByProxy.doctors.call(doctorPosition)

      assert.notEqual(doctorData[1], '5.0', 'doctor rating should not be 5.0 yet')

      await expectThrow(
        iuvoCoreByProxy.setRating(doctorA, '5.0', { from: doctorA })
      )

      await iuvoCoreByProxy.setRating(doctorA, '5.0', { from: ratingOracle })
      doctorData = await iuvoCoreByProxy.doctors.call(doctorPosition)

      assert.equal(doctorData[1], '5.0', 'doctor rating should be 5.0 yet')
    })
  })

  // This section tests contract logic upgradability and data persistance between
  // upgrades.
  describe('Contract Upgradability', () => {
    beforeEach(deployContracts)

    it('should call new contract methods after upgrade', async () => {
      const iuvoCoreV2 = await IuvoCoreV2.new()
      await iuvoCoreByProxy.upgradeTo(iuvoCoreV2.address)
      await iuvoCoreByProxy.initialize()

      const doctorsArrayLength = (await iuvoCoreByProxy.doctorsArrayLength()).toNumber()
      // Nothing special about the number 10001. This was just a random value chosen
      // to test that new logic is available at the call.
      assert.equal(doctorsArrayLength, 10001, 'new method should have been called')
    })

    it('should retain oracle after upgrade', async () => {
      await iuvoCoreByProxy.setRatingOracle(ratingOracle, { from: owner })

      const iuvoCoreV2 = await IuvoCoreV2.new()
      await iuvoCoreByProxy.upgradeTo(iuvoCoreV2.address)
      await iuvoCoreByProxy.initialize()

      const ratingOracleFromState = await iuvoCoreByProxy.ratingOracle()

      assert.equal(ratingOracleFromState, ratingOracle, 'oracles should be the same')
    })

    it('should retain doctors data after contract upgrades', async () => {
      await iuvoCoreByProxy.setDoctor(
        'Dr. Nancy',
        'Love taking care of people',
        'QmcSD36n81qTdHWCiHoFt1jiVpcW1eZoHJALFbBJxYRhLf',
        'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
        { from: doctorA }
      )

      const iuvoCoreV2 = await IuvoCoreV2.new()
      await iuvoCoreByProxy.upgradeTo(iuvoCoreV2.address)
      await iuvoCoreByProxy.initialize()

      const doctorExists = await iuvoCoreByProxy.doctorExists(doctorA)

      assert.isTrue(doctorExists, 'doctor should still exist')
    })

    it('should retain patient appointments after upgrade', async () => {
      await iuvoCoreByProxy.setDoctor(
        'Dr. Nancy',
        'Love taking care of people',
        'QmcSD36n81qTdHWCiHoFt1jiVpcW1eZoHJALFbBJxYRhLf',
        'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
        { from: doctorA }
      )

      await iuvoCoreByProxy.hireDoctor(
        doctorA,
        'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
        0x0,
        'https://kleros.io',
        100,
        0x0,
        { from: patientA }
      )

      const iuvoCoreV2 = await IuvoCoreV2.new()
      await iuvoCoreByProxy.upgradeTo(iuvoCoreV2.address)
      await iuvoCoreByProxy.initialize()

      const numAppointments = await iuvoCoreByProxy.patientAppointmentsLength(patientA)
      assert.equal(numAppointments, 1, 'patient appointments should have been retained')
    })

    it('should not allow upgrades when paused', async () => {
      await iuvoCoreByProxy.pause()

      const iuvoCoreV2 = await IuvoCoreV2.new()
      await expectThrow(
        iuvoCoreByProxy.upgradeTo(iuvoCoreV2.address)
      )
    })
  })
})
