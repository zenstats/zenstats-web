export function isSubAccount(): boolean {
  return localStorage.getItem("user_type") === "sub_account"
}

export function isSubAccountReadOnly(): boolean {
  return isSubAccount()
}

export function getPermissions(): string[] {
  if (!isSubAccount()) return []
  try {
    return JSON.parse(localStorage.getItem("permissions") ?? "[]")
  } catch {
    return []
  }
}

export function hasPerm(perm: string): boolean {
  if (!isSubAccount()) return true
  return getPermissions().includes(perm)
}

export function clearAuthStorage(): void {
  localStorage.removeItem("token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("name")
  localStorage.removeItem("email")
  localStorage.removeItem("is_admin")
  localStorage.removeItem("user_type")
  localStorage.removeItem("sub_account_id")
  localStorage.removeItem("role")
  localStorage.removeItem("permissions")
  localStorage.removeItem("parent_user_id")
}
