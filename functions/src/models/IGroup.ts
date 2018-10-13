import { IUser } from './IUser';

export interface IGroup {
  name: string;
  createdBy: string;
  createdAt: number;
}

export interface IGroupUsersResponse {
  users: IUser[];
}
