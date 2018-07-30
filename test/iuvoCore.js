const IuvoCore = artifacts.require('./IuvoCore.sol')
const PausableProxy = artifacts.require('./PausableProxy.sol')
const { expectThrow } = require('../helpers/utils')

contract('IuvoCore', function (accounts) {
  const owner = accounts[0]
  const ratingOracle = accounts[1]
  const doctorA = accounts[9]
  const patientA = accounts[8]  

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

  const deployMockDoctor = async (iuvoCoreByProxy,doctorAccount) => {
    await iuvoCoreByProxy.setDoctor(
      'Dr. Nancy',
      'Love taking care of people',
      'QmcSD36n81qTdHWCiHoFt1jiVpcW1eZoHJALFbBJxYRhLf',
      'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
      { from: doctorAccount }
    )
  }

  describe('Doctor CRUD operations', () => {
    beforeEach(deployContracts)
  
    it('should allow adding doctors through proxy', async () => {
      
      let doctorExists = await iuvoCoreByProxy.doctorExists(doctorA)
      let doctorCount = (await iuvoCoreByProxy.doctorsArrayLength()).toNumber()

      assert.isFalse(doctorExists,'doctor should not be present yet')
      assert.equal(doctorCount,0,'there should be no doctors')

      await deployMockDoctor(iuvoCoreByProxy,doctorA)      

      doctorExists = await iuvoCoreByProxy.doctorExists(doctorA)
      doctorCount = (await iuvoCoreByProxy.doctorsArrayLength()).toNumber()

      assert.isTrue(doctorExists,'doctor should be present')
      assert.equal(doctorCount,1,'there should be a doctor')
    })

    it('should allow editing doctors through proxy', async () => {

      await iuvoCoreByProxy.setDoctor(
        'Dr. Nanct',
        'Love taking care of people',
        'QmcSD36n81qTdHWCiHoFt1jiVpcW1eZoHJALFbBJxYRhLf',
        'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
        { from: doctorA }
      )

      const doctorPosition = (await iuvoCoreByProxy.doctorPosition.call(doctorA)).toNumber()
      let doctorData = await iuvoCoreByProxy.doctors.call(doctorPosition)

      assert.equal(doctorData[0],'Dr. Nanct','should have saved the data correctly')

      await iuvoCoreByProxy.setDoctor(
        'Dr. Nancy',
        'Love taking care of people',
        'QmcSD36n81qTdHWCiHoFt1jiVpcW1eZoHJALFbBJxYRhLf',
        'QmeKSTWokWbyJ8BG122WLty4adXi1mXEee2evxuHQWNfYm',
        { from: doctorA }
      )
      
      doctorData = await iuvoCoreByProxy.doctors.call(doctorPosition)
      assert.equal(doctorData[0],'Dr. Nancy','should have updated the data correctly')
      
    })

    it('should allow deleting doctors through proxy', async () => {

      await deployMockDoctor(iuvoCoreByProxy,doctorA)

      let doctorExists = await iuvoCoreByProxy.doctorExists(doctorA)
      assert.isTrue(doctorExists,'doctor should be present')
      let doctorCount = (await iuvoCoreByProxy.doctorsArrayLength()).toNumber()
      assert.equal(doctorCount,1,'there should be a doctor')
      
      await iuvoCoreByProxy.deleteDoctor({ from: doctorA })

      doctorExists = await iuvoCoreByProxy.doctorExists(doctorA)
      assert.isFalse(doctorExists,'doctor should be present')
      doctorCount = (await iuvoCoreByProxy.doctorsArrayLength()).toNumber()
      assert.equal(doctorCount,0,'there should be a doctor')
      
    })

    it('should only the ratingOracle to set the doctors rating', async () => {
      await deployMockDoctor(iuvoCoreByProxy,doctorA)

      const doctorPosition = (await iuvoCoreByProxy.doctorPosition.call(doctorA)).toNumber()
      let doctorData = await iuvoCoreByProxy.doctors.call(doctorPosition)

      assert.notEqual(doctorData[1],'5.0','doctor rating should not be 5.0 yet')
      
      await expectThrow(
        iuvoCoreByProxy.setRating(doctorA, '5.0' ,{ from: doctorA })
      )

      await iuvoCoreByProxy.setRating(doctorA, '5.0' ,{ from: ratingOracle })
      doctorData = await iuvoCoreByProxy.doctors.call(doctorPosition)

      assert.equal(doctorData[1],'5.0','doctor rating should be 5.0 yet')
    })
    
  })

  describe('Appointments', () => {
    beforeEach(deployContracts)
  
    it('should patients to hire doctors', async () => {
      
      
      
    })   
    
  })

})
