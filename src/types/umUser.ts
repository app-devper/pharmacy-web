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
