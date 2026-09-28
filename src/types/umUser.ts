export interface UmUser {
  id: string
  firstName: string
  lastName: string
  username: string
  clientId: string
  role: string
  status: string
  phone: string
  email: string
  createdDate: string
  updatedDate: string
  /** What the signed-in user may do to this user, as UM decides it (um-api ADR-0006). */
  can?: UmUserPermissions
}

export interface UmUserPermissions {
  edit: boolean
  delete: boolean
  setStatus: boolean
  setRole: boolean
  setPassword: boolean
  unlock: boolean
  assignableRoles: string[]
}

/** What the signed-in user may do beyond individual users. */
export interface UmUserRules {
  creatableRoles: string[]
}

export interface CreateUserInput {
  firstName: string
  lastName: string
  username: string
  password: string
  phone: string
  email: string
  clientId: string
}

export interface UpdateUserInput {
  firstName: string
  lastName: string
  phone: string
  email: string
}
