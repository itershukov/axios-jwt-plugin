import { IAsyncStorage } from 'universal-storage';
import { AxiosInstance, AxiosResponse, AxiosStatic } from 'axios';

let tokenUpdater: Promise<any> | null = null;

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

enum tokenStatuses {
  expired = 10,
  bad = 11,
  incorrect = 12,
  revoked = 13,
  badSignature = 14
}

const preRefreshPeriod = 10;

let refreshInstance: AxiosInstance;

let storage: IAsyncStorage;
let axios: AxiosStatic;
let convertToCamelCase: boolean;
let globalConfig: IConfig;

export function configureAxiosJWTInterseptors(config: IConfig) {
  if (storage && axios) {
    return;
  }

  storage = config.storage;
  axios = config.axios;
  convertToCamelCase = config.convertToCamelCase === undefined ? true : !!config.convertToCamelCase;
  globalConfig = config;

  refreshInstance = axios.create({
    timeout: (preRefreshPeriod / 2) * 1000
  });

  axios.interceptors.request.use(
    async conf => {
      await refreshTokenIfNeeded(config);
      if (axios.defaults.headers.common['Authorization']) {
        conf.headers['Authorization'] = axios.defaults.headers.common['Authorization'];
      }

      return conf;
    },
    async error => {
      throw error;
    }
  );

  axios.interceptors.response.use(
    async response => {
      return response;
    },
    async error => {
      const originalRequest = error.config;
      const needRefresh =
        error &&
        error.response &&
        error.response.status === 401 &&
        error.response.data &&
        error.response.data.code === tokenStatuses.expired;

      if (!needRefresh) {
        throw error;
      }

      try {
        await refreshToken(config);
        return axios(originalRequest);
      } catch (e) {
        console.error(e);
        throw error;
      }
    }
  );
}

async function refreshTokenIfNeeded(config: IConfig) {
  const { access, refresh } = await getCreds();

  if (!access || !refresh) {
    return;
  }

  const refreshCamel = camelCase(refresh);
  const accessCamel = camelCase(access);

  if (!axios.defaults.headers.common['Authorization'] && access.token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${access.token}`;
  }

  try {
    const now = Math.round(Date.now() / 1000);
    switch (true) {
      case refreshCamel.expiredAt < now:
        break;
      case accessCamel.expiredAt < now:
      case accessCamel.expiredAt < now + preRefreshPeriod: // if token expired soon
        await refreshToken(config);
        break;
      default:
        break;
    }
  } catch (e) {
    console.warn('refreshTokenIfNeeded');
  }
}

export async function refreshToken(config: IConfig) {
  const { refresh } = await getCreds();
  if (!refresh) {
    throw Error();
  }

  if (!tokenUpdater) {
    const refreshTokenKey = convertToCamelCase ? 'refreshToken' : 'refresh_token';
    delete refreshInstance.defaults.headers.common.Authorization;

    tokenUpdater = refreshInstance
      .put(
        config.refreshTokenEndpoint,
        {
          [refreshTokenKey]: refresh.token
        },
        {
          baseURL: axios.defaults.baseURL
        }
      )
      .then(async res => {
        const creds = _getCredsFromRes(res, config);
        return await saveCreds(creds);
      })
      .catch(async e => {
        if (e && e.status === 401) {
          await clearCreds();
        }
        throw e;
      })
      .finally(() => {
        tokenUpdater = null;
      });
  }

  return tokenUpdater;
}

export async function saveCreds(creds: ICreds) {
  if (!creds.access || !creds.access.token) {
    return;
  }

  axios.defaults.headers.common['Authorization'] = `Bearer ${creds.access.token}`;
  const preparedCreds = convertToCamelCase ? camelCase(creds) : creds;
  globalConfig && globalConfig.onSaveCreds && globalConfig.onSaveCreds(preparedCreds);
  return await storage.setItem('creds', JSON.stringify(preparedCreds));
}

export async function clearCreds() {
  try {
    delete axios.defaults.headers.common['Authorization'];
    globalConfig && globalConfig.onClearCreds && globalConfig.onClearCreds();
    return await storage.setItem('creds', '');
  } catch (e) {
    console.warn('Error at clearCreds method!', e);
    return;
  }
}

export async function getCreds() {
  try {
    const credsItem = (storage && (await storage.getItem('creds'))) || '{}';
    const creds = JSON.parse(credsItem);

    globalConfig && globalConfig.onGetCreds && globalConfig.onGetCreds(creds);
    return creds;
  } catch (e) {
    console.warn('Error at getCreds method!', e);
    return {};
  }
}

function camelCase(obj: { [k: string]: any }) {
  let newObj: { [k: string]: any } = {};
  for (const d in obj) {
    if (obj.hasOwnProperty(d)) {
      const newKey = d.replace(/(\_\w)/g, function(m) {
        return m[1].toUpperCase();
      });
      newObj[newKey] = obj[d];
    }
  }
  return newObj;
}

function _getCredsFromRes(res, config): ICreds {
  if (config.getCredsFromRefreshResponse) {
    const result = config.getCredsFromRefreshResponse(res);
    if (result.access) {
      return result;
    }
    throw new Error('Function getCredsFromRefreshResponse wrong implemented. It should return data compatible with ICreds.');
  }

  if (res.data.access) {
    return res.data;
  }

  if (res.data.data.access) {
    return res.data.data;
  }

  throw new Error("Can't parse response to get tokens");
}
