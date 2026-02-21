import { describe, it, expect } from 'vitest'
import { mapDailyQuoteEntries, pickEntryForDate, formatMonth, formatDisplayDate } from './dailyQuote'

describe('dailyQuote utils', () => {
  it('mapDailyQuoteEntries should map nested list and build image url', () => {
    const payload = {
      data: {
        list: [
          { fileName: 'abc123.png', date: '2026-01-31', content: 'Hello' },
          { filename: 'def456.jpg', day: '1', text: 'Hi' }
        ]
      }
    }

    const entries = mapDailyQuoteEntries(payload, 'https://cdn.example.com/base')
    expect(entries).toHaveLength(2)
    expect(entries[0].imageUrl).toBe('https://cdn.example.com/base/abc123.png')
    expect(entries[0].text).toBe('Hello')
    expect(entries[0].dayOfMonth).toBe(31)
    expect(entries[1].imageUrl).toBe('https://cdn.example.com/base/def456.jpg')
    expect(entries[1].dayOfMonth).toBe(1)
  })

  it('pickEntryForDate should match exact date first', () => {
    const entries = mapDailyQuoteEntries(
      {
        list: [
          { fileName: 'a', date: '2026-01-30', content: 'A' },
          { fileName: 'b', date: '2026-01-31', content: 'B' }
        ]
      },
      'https://cdn.example.com/'
    )
    const result = pickEntryForDate(entries, new Date('2026-01-31'))
    expect(result?.fileName).toBe('b')
  })

  it('mapDailyQuoteEntries should handle nested word_every_day list and timestamp date', () => {
    const payload = {
      data: {
        word_every_day: {
          list: [
            {
              fileName: '/word_every_day/38817c36df809108',
              date: 1769788805000,
              contentInternation: { zh: '再狭小的树缝也会被月亮拥抱' }
            }
          ]
        }
      }
    }

    const expectedDate = new Date(1769788805000)
    const expectedDateText = `${expectedDate.getFullYear()}-${String(
      expectedDate.getMonth() + 1
    ).padStart(2, '0')}-${String(expectedDate.getDate()).padStart(2, '0')}`

    const entries = mapDailyQuoteEntries(payload, 'https://top-widgets-oss-cdn.topwidgets.com')
    expect(entries).toHaveLength(1)
    expect(entries[0].imageUrl).toBe('https://top-widgets-oss-cdn.topwidgets.com/word_every_day/38817c36df809108')
    expect(entries[0].text).toBe('再狭小的树缝也会被月亮拥抱')
    expect(entries[0].date).toBe(expectedDateText)
    expect(entries[0].year).toBe(expectedDate.getFullYear())
    expect(entries[0].month).toBe(expectedDate.getMonth() + 1)
    expect(entries[0].dayOfMonth).toBe(expectedDate.getDate())
  })

  it('formatMonth should output YYYY-MM', () => {
    expect(formatMonth(new Date('2026-01-15'))).toBe('2026-01')
  })

  it('formatDisplayDate should fall back to provided date', () => {
    expect(formatDisplayDate(null, new Date('2026-01-05'))).toBe('05/01')
  })
})
