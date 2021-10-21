import { IAsyncStorage } from 'universal-storage';
import { AxiosResponse, AxiosStatic } from 'axios';
interface IConfig {
  storage: IAsyncStorage;
  axios: AxiosStatic;
  refreshTokenEndpoint: string;
  convertToCamelCase?: boolean;
  getCredsFromRefreshResponse?: (res: AxiosResponse) => ICreds;
  onSaveCreds?(creds: any): void | Promise<void>;
  onGetCreds?(creds: any): void | Promise<void>;
  onClearCreds?(): void | Promise<void>;
}
export interface ICreds {
  access?: Token;
  refresh?: Token;
}
export interface Token {
  id: string;
  token: string;
  userId: string;
  issuedAt: number;
  expiredAt: number;
}
export declare function configureAxiosJWTInterseptors(config: IConfig): void;
export declare function refreshToken(config: IConfig): Promise<any>;
export declare function saveCreds(creds: ICreds): Promise<string | void>;
export declare function clearCreds(): Promise<string | void>;
export declare function getCreds(): Promise<any>;
export {};
