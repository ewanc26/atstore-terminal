import { cyan, dim, green } from '../../style.js'
import { describeOAuthSession, loginWithOAuth, signOutOAuth } from '../../oauth/index.js'

export async function loginCommand(handle: string): Promise<void> {
  const session = await loginWithOAuth(handle)
  console.log(green(`Signed in as ${session.did}`))
  console.log(dim('OAuth tokens are stored outside this repo with 0600 permissions.'))
}

export async function logoutCommand(): Promise<void> {
  const { did, revoked } = await signOutOAuth()
  console.log(green(`Signed out ${did}`))
  if (!revoked)
    console.log(dim('Local session removed; the server could not be reached to revoke it.'))
}

export async function whoamiCommand(): Promise<void> {
  const info = await describeOAuthSession()
  console.log(cyan(info.did))
  console.log(`issuer:  ${info.issuer}`)
  console.log(`audience: ${info.audience}`)
  console.log(`scope:   ${info.scope}`)
  if (info.expiresAt) console.log(`expires: ${info.expiresAt.toISOString()}`)
}
