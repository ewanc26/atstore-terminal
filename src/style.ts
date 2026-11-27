const enabled =
  Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && process.env.TERM !== 'dumb'

function wrap(open: string, close: string): (input: string) => string {
  return (input) => (enabled ? `${open}${input}${close}` : input)
}

export const bold = wrap('\u001b[1m', '\u001b[22m')
export const dim = wrap('\u001b[2m', '\u001b[22m')
export const cyan = wrap('\u001b[36m', '\u001b[39m')
export const green = wrap('\u001b[32m', '\u001b[39m')
export const yellow = wrap('\u001b[33m', '\u001b[39m')
