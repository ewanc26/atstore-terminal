import { visibleWidth } from './width.js'

export function wrap(input: string, width: number): string[] {
  const lines: string[] = []
  for (const paragraph of input.split(/\n{2,}/)) {
    let line = ''
    for (const word of paragraph.replace(/\s+/g, ' ').split(' ')) {
      if (!line) {
        line = word
      } else if (visibleWidth(line) + 1 + visibleWidth(word) <= width) {
        line += ` ${word}`
      } else {
        lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
    lines.push('')
  }
  return lines.slice(0, -1)
}
