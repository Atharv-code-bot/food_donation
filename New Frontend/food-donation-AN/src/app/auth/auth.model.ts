export interface AuthResponseData {
  token: string;
  role: string;
  id: string;
}

export interface RegisterRequestData {
  username: string;
  email: string;
  password: string;
  role: string;
  fullname: string;
  phone: string;
  address: string;
}

export interface LoginRequestData {
  username: string;
  password: string;
}
