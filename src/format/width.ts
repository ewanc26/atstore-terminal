const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const ANSI = /\u001b\[[0-9;]*m/g

/** Approximate terminal cell width, including wide CJK and emoji graphemes. */
export function visibleWidth(input: string): number {
  const text = input.replace(ANSI, '')
  let width = 0
  for (const { segment } of segmenter.segment(text)) {
    const cp = segment.codePointAt(0) ?? 0
    width += isWide(cp) || /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(segment) ? 2 : 1
  }
  return width
}

export function truncate(input: string, maxWidth: number): string {
  if (visibleWidth(input) <= maxWidth) return input
  if (maxWidth <= 1) return '…'.slice(0, maxWidth)

  let result = ''
  let width = 0
  for (const { segment } of segmenter.segment(input)) {
    const next = visibleWidth(segment)
    if (width + next > maxWidth - 1) break
    result += segment
    width += next
  }
  return `${result}…`
}

export function pad(input: string, width: number): string {
  return input + ' '.repeat(Math.max(0, width - visibleWidth(input)))
}

export function padLeft(input: string, width: number): string {
  return ' '.repeat(Math.max(0, width - visibleWidth(input))) + input
}

function isWide(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  )
}
