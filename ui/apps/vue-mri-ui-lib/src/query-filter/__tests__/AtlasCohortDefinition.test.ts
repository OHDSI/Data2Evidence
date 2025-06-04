import {
  isConditionOccurrence,
  isDrugExposure,
  isProcedureOccurrence,
  isObservation,
  isVisitOccurrence,
  isDeviceExposure,
  isMeasurement,
  isDeath,
  isDrugEra,
  isObservationPeriod,
  getCriteriaType,
  getCriteriaObject,
  CriteriaListItem,
  ConditionOccurrence,
  DrugExposure,
  ProcedureOccurrence,
  Observation,
  VisitOccurrence,
  DeviceExposure,
  Measurement,
  Death,
  DrugEra,
  ObservationPeriod,
} from '../AtlasCohortDefinition'

describe('AtlasCohortDefinition Type Guards', () => {
  describe('isConditionOccurrence', () => {
    it('should return true for valid ConditionOccurrence', () => {
      const condition: ConditionOccurrence = {
        CodesetId: 1,
        ConditionTypeExclude: false,
      }
      expect(isConditionOccurrence(condition)).toBe(true)
    })

    it('should return false for invalid ConditionOccurrence', () => {
      expect(isConditionOccurrence({})).toBe(false)
      expect(isConditionOccurrence(null)).toBeFalsy()
      expect(isConditionOccurrence(undefined)).toBeFalsy()
      expect(isConditionOccurrence({ CodesetId: 1 })).toBe(false) // Missing ConditionTypeExclude
      expect(isConditionOccurrence({ ConditionTypeExclude: false })).toBe(false) // Missing CodesetId
    })
  })

  describe('isDrugExposure', () => {
    it('should return true for valid DrugExposure', () => {
      const drug: DrugExposure = {
        CodesetId: 1,
        DrugTypeExclude: false,
      }
      expect(isDrugExposure(drug)).toBe(true)
    })

    it('should return false for invalid DrugExposure', () => {
      expect(isDrugExposure({})).toBe(false)
      expect(isDrugExposure({ CodesetId: 1 })).toBe(false)
      expect(isDrugExposure({ DrugTypeExclude: false })).toBe(false)
    })
  })

  describe('isProcedureOccurrence', () => {
    it('should return true for valid ProcedureOccurrence', () => {
      const procedure: ProcedureOccurrence = {
        CodesetId: 1,
        ProcedureTypeExclude: false,
      }
      expect(isProcedureOccurrence(procedure)).toBe(true)
    })

    it('should return false for invalid ProcedureOccurrence', () => {
      expect(isProcedureOccurrence({})).toBe(false)
      expect(isProcedureOccurrence({ CodesetId: 1 })).toBe(false)
      expect(isProcedureOccurrence({ ProcedureTypeExclude: false })).toBe(false)
    })
  })

  describe('isObservation', () => {
    it('should return true for valid Observation', () => {
      const observation: Observation = {
        CodesetId: 1,
        ObservationTypeExclude: false,
      }
      expect(isObservation(observation)).toBe(true)
    })

    it('should return false for invalid Observation', () => {
      expect(isObservation({})).toBe(false)
      expect(isObservation({ CodesetId: 1 })).toBe(false)
      expect(isObservation({ ObservationTypeExclude: false })).toBe(false)
    })
  })

  describe('isVisitOccurrence', () => {
    it('should return true for valid VisitOccurrence', () => {
      const visit: VisitOccurrence = {
        CodesetId: 1,
        VisitTypeExclude: false,
      }
      expect(isVisitOccurrence(visit)).toBe(true)
    })

    it('should return false for invalid VisitOccurrence', () => {
      expect(isVisitOccurrence({})).toBe(false)
      expect(isVisitOccurrence({ CodesetId: 1 })).toBe(false)
      expect(isVisitOccurrence({ VisitTypeExclude: false })).toBe(false)
    })
  })

  describe('isDeviceExposure', () => {
    it('should return true for valid DeviceExposure', () => {
      const device: DeviceExposure = {
        CodesetId: 1,
        DeviceTypeExclude: false,
      }
      expect(isDeviceExposure(device)).toBe(true)
    })

    it('should return false for invalid DeviceExposure', () => {
      expect(isDeviceExposure({})).toBe(false)
      expect(isDeviceExposure({ CodesetId: 1 })).toBe(false)
      expect(isDeviceExposure({ DeviceTypeExclude: false })).toBe(false)
    })
  })

  describe('isMeasurement', () => {
    it('should return true for valid Measurement', () => {
      const measurement: Measurement = {
        CodesetId: 1,
        MeasurementTypeExclude: false,
      }
      expect(isMeasurement(measurement)).toBe(true)
    })

    it('should return false for invalid Measurement', () => {
      expect(isMeasurement({})).toBe(false)
      expect(isMeasurement({ CodesetId: 1 })).toBe(false)
      expect(isMeasurement({ MeasurementTypeExclude: false })).toBe(false)
    })
  })

  describe('isDeath', () => {
    it('should return true for valid Death with CodesetId', () => {
      const death: Death = {
        CodesetId: 1,
        DeathTypeExclude: false,
      }
      expect(isDeath(death)).toBe(true)
    })

    it('should return true for valid Death with only DeathTypeExclude', () => {
      const death: Death = {
        DeathTypeExclude: false,
      }
      expect(isDeath(death)).toBe(true)
    })

    it('should return false for invalid Death', () => {
      expect(isDeath({})).toBe(false)
      expect(isDeath(null)).toBeFalsy()
      expect(isDeath(undefined)).toBeFalsy()
    })
  })

  describe('isDrugEra', () => {
    it('should return true for DrugEra with EraStartDate', () => {
      const drugEra: DrugEra = {
        EraStartDate: {
          Value: '2023-01-01',
          Extent: '2023-12-31',
          Op: 'bt',
        },
      }
      expect(isDrugEra(drugEra)).toBe(true)
    })

    it('should return true for DrugEra with EraEndDate', () => {
      const drugEra: DrugEra = {
        EraEndDate: {
          Value: '2023-01-01',
          Extent: '2023-12-31',
          Op: 'bt',
        },
      }
      expect(isDrugEra(drugEra)).toBe(true)
    })

    it('should return true for DrugEra with CodesetId', () => {
      const drugEra: DrugEra = {
        CodesetId: 1,
      }
      expect(isDrugEra(drugEra)).toBe(true)
    })

    it('should return false for invalid DrugEra', () => {
      expect(isDrugEra({})).toBe(false)
      expect(isDrugEra(null)).toBeFalsy()
      expect(isDrugEra(undefined)).toBeFalsy()
    })
  })

  describe('isObservationPeriod', () => {
    it('should return true for ObservationPeriod with PeriodStartDate', () => {
      const obsPeriod: ObservationPeriod = {
        PeriodStartDate: {
          Value: '2023-01-01',
          Extent: '2023-12-31',
          Op: 'bt',
        },
      }
      expect(isObservationPeriod(obsPeriod)).toBe(true)
    })

    it('should return true for ObservationPeriod with PeriodEndDate', () => {
      const obsPeriod: ObservationPeriod = {
        PeriodEndDate: {
          Value: '2023-01-01',
          Extent: '2023-12-31',
          Op: 'bt',
        },
      }
      expect(isObservationPeriod(obsPeriod)).toBe(true)
    })

    it('should return false for invalid ObservationPeriod', () => {
      expect(isObservationPeriod({})).toBe(false)
      expect(isObservationPeriod(null)).toBeFalsy()
      expect(isObservationPeriod(undefined)).toBeFalsy()
    })
  })
})

describe('AtlasCohortDefinition Helper Functions', () => {
  describe('getCriteriaType', () => {
    it('should return correct type for ConditionOccurrence', () => {
      const item: CriteriaListItem = {
        ConditionOccurrence: {
          CodesetId: 1,
          ConditionTypeExclude: false,
        },
      }
      expect(getCriteriaType(item)).toBe('ConditionOccurrence')
    })

    it('should return correct type for DrugExposure', () => {
      const item: CriteriaListItem = {
        DrugExposure: {
          CodesetId: 1,
          DrugTypeExclude: false,
        },
      }
      expect(getCriteriaType(item)).toBe('DrugExposure')
    })

    it('should return correct type for DrugEra', () => {
      const item: CriteriaListItem = {
        DrugEra: {
          CodesetId: 1,
        },
      }
      expect(getCriteriaType(item)).toBe('DrugEra')
    })

    it('should return correct type for ProcedureOccurrence', () => {
      const item: CriteriaListItem = {
        ProcedureOccurrence: {
          CodesetId: 1,
          ProcedureTypeExclude: false,
        },
      }
      expect(getCriteriaType(item)).toBe('ProcedureOccurrence')
    })

    it('should return correct type for Observation', () => {
      const item: CriteriaListItem = {
        Observation: {
          CodesetId: 1,
          ObservationTypeExclude: false,
        },
      }
      expect(getCriteriaType(item)).toBe('Observation')
    })

    it('should return correct type for VisitOccurrence', () => {
      const item: CriteriaListItem = {
        VisitOccurrence: {
          CodesetId: 1,
          VisitTypeExclude: false,
        },
      }
      expect(getCriteriaType(item)).toBe('VisitOccurrence')
    })

    it('should return correct type for DeviceExposure', () => {
      const item: CriteriaListItem = {
        DeviceExposure: {
          CodesetId: 1,
          DeviceTypeExclude: false,
        },
      }
      expect(getCriteriaType(item)).toBe('DeviceExposure')
    })

    it('should return correct type for Measurement', () => {
      const item: CriteriaListItem = {
        Measurement: {
          CodesetId: 1,
          MeasurementTypeExclude: false,
        },
      }
      expect(getCriteriaType(item)).toBe('Measurement')
    })

    it('should return correct type for Death', () => {
      const item: CriteriaListItem = {
        Death: {
          CodesetId: 1,
          DeathTypeExclude: false,
        },
      }
      expect(getCriteriaType(item)).toBe('Death')
    })

    it('should return correct type for ObservationPeriod', () => {
      const item: CriteriaListItem = {
        ObservationPeriod: {
          PeriodStartDate: {
            Value: '2023-01-01',
            Extent: '2023-12-31',
            Op: 'bt',
          },
        },
      }
      expect(getCriteriaType(item)).toBe('ObservationPeriod')
    })

    it('should return null for empty criteria', () => {
      const item: CriteriaListItem = {}
      expect(getCriteriaType(item)).toBeNull()
    })

    it('should prioritize first defined criteria when multiple are present', () => {
      const item: CriteriaListItem = {
        ConditionOccurrence: {
          CodesetId: 1,
          ConditionTypeExclude: false,
        },
        DrugExposure: {
          CodesetId: 2,
          DrugTypeExclude: false,
        },
      }
      expect(getCriteriaType(item)).toBe('ConditionOccurrence')
    })
  })

  describe('getCriteriaObject', () => {
    it('should return ConditionOccurrence object', () => {
      const conditionOccurrence: ConditionOccurrence = {
        CodesetId: 1,
        ConditionTypeExclude: false,
        First: true,
      }
      const item: CriteriaListItem = {
        ConditionOccurrence: conditionOccurrence,
      }
      
      const result = getCriteriaObject(item)
      expect(result).toBe(conditionOccurrence)
    })

    it('should return DrugExposure object', () => {
      const drugExposure: DrugExposure = {
        CodesetId: 1,
        DrugTypeExclude: false,
        First: false,
      }
      const item: CriteriaListItem = {
        DrugExposure: drugExposure,
      }
      
      const result = getCriteriaObject(item)
      expect(result).toBe(drugExposure)
    })

    it('should return DrugEra object', () => {
      const drugEra: DrugEra = {
        CodesetId: 1,
        EraStartDate: {
          Value: '2023-01-01',
          Extent: '2023-12-31',
          Op: 'bt',
        },
      }
      const item: CriteriaListItem = {
        DrugEra: drugEra,
      }
      
      const result = getCriteriaObject(item)
      expect(result).toBe(drugEra)
    })

    it('should return ProcedureOccurrence object', () => {
      const procedureOccurrence: ProcedureOccurrence = {
        CodesetId: 1,
        ProcedureTypeExclude: false,
      }
      const item: CriteriaListItem = {
        ProcedureOccurrence: procedureOccurrence,
      }
      
      const result = getCriteriaObject(item)
      expect(result).toBe(procedureOccurrence)
    })

    it('should return Observation object', () => {
      const observation: Observation = {
        CodesetId: 1,
        ObservationTypeExclude: false,
      }
      const item: CriteriaListItem = {
        Observation: observation,
      }
      
      const result = getCriteriaObject(item)
      expect(result).toBe(observation)
    })

    it('should return VisitOccurrence object', () => {
      const visitOccurrence: VisitOccurrence = {
        CodesetId: 1,
        VisitTypeExclude: false,
      }
      const item: CriteriaListItem = {
        VisitOccurrence: visitOccurrence,
      }
      
      const result = getCriteriaObject(item)
      expect(result).toBe(visitOccurrence)
    })

    it('should return DeviceExposure object', () => {
      const deviceExposure: DeviceExposure = {
        CodesetId: 1,
        DeviceTypeExclude: false,
      }
      const item: CriteriaListItem = {
        DeviceExposure: deviceExposure,
      }
      
      const result = getCriteriaObject(item)
      expect(result).toBe(deviceExposure)
    })

    it('should return Measurement object', () => {
      const measurement: Measurement = {
        CodesetId: 1,
        MeasurementTypeExclude: false,
      }
      const item: CriteriaListItem = {
        Measurement: measurement,
      }
      
      const result = getCriteriaObject(item)
      expect(result).toBe(measurement)
    })

    it('should return Death object', () => {
      const death: Death = {
        CodesetId: 1,
        DeathTypeExclude: false,
      }
      const item: CriteriaListItem = {
        Death: death,
      }
      
      const result = getCriteriaObject(item)
      expect(result).toBe(death)
    })

    it('should return ObservationPeriod object', () => {
      const observationPeriod: ObservationPeriod = {
        PeriodStartDate: {
          Value: '2023-01-01',
          Extent: '2023-12-31',
          Op: 'bt',
        },
      }
      const item: CriteriaListItem = {
        ObservationPeriod: observationPeriod,
      }
      
      const result = getCriteriaObject(item)
      expect(result).toBe(observationPeriod)
    })

    it('should return null for empty criteria', () => {
      const item: CriteriaListItem = {}
      expect(getCriteriaObject(item)).toBeNull()
    })

    it('should return first available criteria when multiple are present', () => {
      const conditionOccurrence: ConditionOccurrence = {
        CodesetId: 1,
        ConditionTypeExclude: false,
      }
      const drugExposure: DrugExposure = {
        CodesetId: 2,
        DrugTypeExclude: false,
      }
      const item: CriteriaListItem = {
        ConditionOccurrence: conditionOccurrence,
        DrugExposure: drugExposure,
      }
      
      const result = getCriteriaObject(item)
      expect(result).toBe(conditionOccurrence)
    })
  })

  describe('edge cases and type safety', () => {
    it('should handle undefined and null inputs safely', () => {
      expect(getCriteriaType({} as CriteriaListItem)).toBeNull()
      expect(getCriteriaObject({} as CriteriaListItem)).toBeNull()
    })

    it('should work with complex criteria objects', () => {
      const complexCondition: ConditionOccurrence = {
        CodesetId: 1,
        ConditionTypeExclude: false,
        First: true,
        OccurrenceStartDate: {
          Value: '2023-01-01',
          Extent: '2023-12-31',
          Op: 'bt',
        },
        Age: {
          Value: 18,
          Extent: 65,
          Op: 'bt',
        },
      }
      
      const item: CriteriaListItem = {
        ConditionOccurrence: complexCondition,
      }
      
      expect(getCriteriaType(item)).toBe('ConditionOccurrence')
      expect(getCriteriaObject(item)).toBe(complexCondition)
      expect(isConditionOccurrence(getCriteriaObject(item))).toBe(true)
    })

    it('should work with minimal valid criteria objects', () => {
      const minimalCondition: ConditionOccurrence = {
        CodesetId: 1,
        ConditionTypeExclude: false,
      }
      
      expect(isConditionOccurrence(minimalCondition)).toBe(true)
    })
  })
})