import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyConstraintValue } from '../applyConstraintValue'

describe('applyConstraintValue', () => {
  let dispatch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    dispatch = vi.fn().mockResolvedValue(undefined)
  })

  const constraint = (overrides: Record<string, any> = {}, props: Record<string, any> = {}) => ({
    id: 'constraint-1',
    props: { type: 'text', name: 'Age', ...props },
    ...overrides,
  })

  describe('numeric constraints', () => {
    it('parses an operator-prefixed string', async () => {
      await applyConstraintValue(dispatch, constraint({}, { type: 'num' }), '>=65')
      expect(dispatch).toHaveBeenCalledWith('updateConstraintValue', {
        constraintId: 'constraint-1',
        value: [{ op: '>=', value: 65 }],
      })
    })

    it('overrides the default = op for a plain numeric string', async () => {
      await applyConstraintValue(dispatch, constraint({}, { type: 'num' }), '50', '>')
      expect(dispatch).toHaveBeenCalledWith('updateConstraintValue', {
        constraintId: 'constraint-1',
        value: [{ op: '>', value: 50 }],
      })
    })

    it('does not override the op when the string already carries operators', async () => {
      await applyConstraintValue(dispatch, constraint({}, { type: 'num' }), '>50,<=70', '>=')
      expect(dispatch).toHaveBeenCalledWith('updateConstraintValue', {
        constraintId: 'constraint-1',
        value: [
          { op: '>', value: 50 },
          { op: '<=', value: 70 },
        ],
      })
    })

    it('accepts a numeric input with an explicit operator', async () => {
      await applyConstraintValue(dispatch, constraint({}, { type: 'num' }), 42, '<')
      expect(dispatch).toHaveBeenCalledWith('updateConstraintValue', {
        constraintId: 'constraint-1',
        value: [{ op: '<', value: 42 }],
      })
    })

    it('coerces a non-string, non-number numeric value', async () => {
      await applyConstraintValue(dispatch, constraint({}, { type: 'num' }), { valueOf: () => 7 } as any)
      expect(dispatch).toHaveBeenCalledWith('updateConstraintValue', {
        constraintId: 'constraint-1',
        value: [{ op: '=', value: 7 }],
      })
    })

    it('rejects an unparseable numeric value', async () => {
      await expect(applyConstraintValue(dispatch, constraint({}, { type: 'num' }), 'abc')).rejects.toThrow(
        'Invalid numeric value for Age'
      )
      expect(dispatch).not.toHaveBeenCalled()
    })
  })

  describe('date/year range ({ from, to }) values', () => {
    it('converts a full year range into a date-constraint dispatch', async () => {
      await applyConstraintValue(dispatch, constraint({}, { type: 'text' }), { from: '2000', to: '2010' })
      const [action, payload] = dispatch.mock.calls[0]
      expect(action).toBe('updateDateConstraintValue')
      expect(payload.constraintId).toBe('constraint-1')
      expect((payload.fromDateValue as Date).toISOString()).toContain('2000-01-01')
      expect((payload.toDateValue as Date).toISOString()).toContain('2010-12-31')
      expect(payload.isUTC).toBe(false)
    })

    it('falls back to the "to" year when "from" is missing', async () => {
      await applyConstraintValue(dispatch, constraint(), { from: '', to: '2015' })
      const payload = dispatch.mock.calls[0][1]
      expect((payload.fromDateValue as Date).toISOString()).toContain('2015-01-01')
      expect((payload.toDateValue as Date).toISOString()).toContain('2015-12-31')
    })

    it('falls back to the "from" year when "to" is missing', async () => {
      await applyConstraintValue(dispatch, constraint(), { from: '2015', to: '' })
      const payload = dispatch.mock.calls[0][1]
      expect((payload.fromDateValue as Date).toISOString()).toContain('2015-01-01')
      expect((payload.toDateValue as Date).toISOString()).toContain('2015-12-31')
    })

    it('rejects when neither year is present', async () => {
      await expect(applyConstraintValue(dispatch, constraint(), { from: '', to: '' })).rejects.toThrow(
        'Missing year value for Age'
      )
      expect(dispatch).not.toHaveBeenCalled()
    })

    // Regression: a full-date { from, to } range (the shape the WebMCP cohort-patch
    // applier sends for `date`-type constraints) must be parsed as-is, NOT collapsed
    // into a Jan-1..Dec-31 year span. Before the fix this hit the year-range logic and
    // produced `new Date('2020-06-01-01-01')` → Invalid Date.
    it('parses a full-date range as-is instead of treating it as a year span', async () => {
      await applyConstraintValue(dispatch, constraint({}, { type: 'datetime' }), {
        from: '2020-06-01',
        to: '2020-06-30',
      })
      const [action, payload] = dispatch.mock.calls[0]
      expect(action).toBe('updateDateConstraintValue')
      expect((payload.fromDateValue as Date).toISOString()).toContain('2020-06-01')
      expect((payload.toDateValue as Date).toISOString()).toContain('2020-06-30')
    })

    it('handles a full-date range regardless of constraint type', async () => {
      await applyConstraintValue(dispatch, constraint({}, { type: 'time' }), {
        from: '2019-01-15',
        to: '2019-12-20',
      })
      const payload = dispatch.mock.calls[0][1]
      expect((payload.fromDateValue as Date).toISOString()).toContain('2019-01-15')
      expect((payload.toDateValue as Date).toISOString()).toContain('2019-12-20')
    })

    it('falls back to the populated bound for a single-sided full-date range', async () => {
      await applyConstraintValue(dispatch, constraint({}, { type: 'datetime' }), {
        from: '2021-03-10',
        to: '',
      })
      const payload = dispatch.mock.calls[0][1]
      expect((payload.fromDateValue as Date).toISOString()).toContain('2021-03-10')
      expect((payload.toDateValue as Date).toISOString()).toContain('2021-03-10')
    })
  })

  describe('time / datetime constraints', () => {
    // NOTE: a { from, to } object never reaches this branch — the range branch above
    // intercepts any object carrying both keys (handling both bare-year and full-date
    // ranges). This branch only handles scalar / { value } dates.
    it('handles a { value } payload', async () => {
      await applyConstraintValue(dispatch, constraint({}, { type: 'datetime' }), { value: '2021-03-15' })
      const payload = dispatch.mock.calls[0][1]
      expect((payload.fromDateValue as Date).toISOString()).toContain('2021-03-15')
      expect((payload.toDateValue as Date).toISOString()).toContain('2021-03-15')
    })

    it('handles a bare scalar date string', async () => {
      await applyConstraintValue(dispatch, constraint({}, { type: 'datetime' }), '2022-11-20')
      const payload = dispatch.mock.calls[0][1]
      expect((payload.fromDateValue as Date).toISOString()).toContain('2022-11-20')
    })

    it('rejects when no date value is present', async () => {
      await expect(applyConstraintValue(dispatch, constraint({}, { type: 'time' }), '')).rejects.toThrow(
        'Missing date value for Age'
      )
      expect(dispatch).not.toHaveBeenCalled()
    })
  })

  describe('scalar (default) constraints', () => {
    it('dispatches a scalar string value with derived display value', async () => {
      await applyConstraintValue(dispatch, constraint(), 'male')
      expect(dispatch).toHaveBeenCalledWith('updateConstraintValue', {
        constraintId: 'constraint-1',
        value: [{ value: 'male', score: 1, display_value: 'male', text: 'male' }],
      })
    })

    it('prefers an explicit displayValue argument', async () => {
      await applyConstraintValue(dispatch, constraint(), 'M', '=', 'Male')
      expect(dispatch).toHaveBeenCalledWith('updateConstraintValue', {
        constraintId: 'constraint-1',
        value: [{ value: 'M', score: 1, display_value: 'Male', text: 'Male' }],
      })
    })

    it('unwraps a { value, displayName } object', async () => {
      await applyConstraintValue(dispatch, constraint(), { value: 'M', displayName: 'Male' })
      expect(dispatch).toHaveBeenCalledWith('updateConstraintValue', {
        constraintId: 'constraint-1',
        value: [{ value: 'M', score: 1, display_value: 'Male', text: 'Male' }],
      })
    })

    // Regression (#2913): emptying an optional text / concept-set filter clears it
    // (dispatches an empty value) instead of erroring, so the required-filters modal can
    // remove a previously-set optional value.
    it.each([['text'], ['conceptSet']])('clears an empty %s constraint instead of rejecting', async type => {
      await applyConstraintValue(dispatch, constraint({}, { type }), '')
      expect(dispatch).toHaveBeenCalledWith('updateConstraintValue', {
        constraintId: 'constraint-1',
        value: [],
      })
    })

    it.each([[null], [undefined], [''], ['   ']])(
      'rejects a missing value for a non-clearable constraint type (%p)',
      async input => {
        await expect(applyConstraintValue(dispatch, constraint({}, { type: 'attribute' }), input)).rejects.toThrow(
          'Missing value for Age'
        )
        expect(dispatch).not.toHaveBeenCalled()
      }
    )

    it('rejects an unsupported object value instead of stringifying it', async () => {
      await expect(applyConstraintValue(dispatch, constraint(), { foo: 'bar' })).rejects.toThrow(
        'Unsupported object value for Age'
      )
      expect(dispatch).not.toHaveBeenCalled()
    })
  })

  it('falls back to the constraint id in error messages when name is absent', async () => {
    await expect(
      applyConstraintValue(dispatch, constraint({}, { type: 'num', name: undefined }), 'abc')
    ).rejects.toThrow('Invalid numeric value for constraint-1')
  })
})
