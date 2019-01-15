import { IAsyncStorage } from 'universal-storage';
import { AxiosStatic } from 'axios';
interface IConfig {
  storage: IAsyncStorage;
  axios: AxiosStatic;
  refreshTokenURL?: string;
}
export declare function configureAxiosJWTInterseptors(config: IConfig): void;
export declare function saveCreds(creds: any): Promise<string | void>;
export declare function clearCreds(): Promise<string | void>;
export declare function getCreds(): Promise<any>;
export {};
