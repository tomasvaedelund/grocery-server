import { IGroup } from './IGroup';

export interface IUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export interface IUserGroupsResponse {
  groups: IGroup[];
}
