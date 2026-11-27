import process from 'node:process'
import { execFile } from 'node:child_process'

/** Hand a listing URL to the platform's browser without blocking the TUI. */
export function openInBrowser(url: string): void {
  const opener =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  execFile(opener, args, { windowsHide: true }, () => undefined)
}
