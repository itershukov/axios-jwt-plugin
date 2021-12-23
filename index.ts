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

// enum tokenStatuses {
//   expired = 10,
//   bad = 11,
//   incorrect = 12,
//   revoked = 13,
//   badSignature = 14
// }

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
    timeout: (preRefreshPeriod / 2) * 10 * 1000
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
      return Promise.reject(error);
    }
  );

  axios.interceptors.response.use(
    async response => {
      return response;
    },
    async error => {
      // const tryIndex = Math.round(Math.random()*10000)
      const originalRequest = error.config;
      const { access, refresh } = await getCreds();
      const haveCreds = access && refresh;
      // console.log('originalRequest.tryCount', originalRequest.params, error.response)
      const tryCount = originalRequest.params?.tryCount || 0;

      const needRefresh = haveCreds && error && error.response && error.response.status === 401 && tryCount < 3;

      if (!needRefresh) {
        // console.log('before refreshToken CLEAR CREDS', error, error.response, config)
        // await clearCreds();
        return Promise.reject(error);
      }

      try {
        // console.log('before refreshToken', tryIndex, config)
        if (!originalRequest.params) {
          originalRequest.params = {};
        }
        originalRequest.params.tryCount = tryCount + 1;
        await new Promise(resolve => setTimeout(resolve, 300 * tryCount));
        // await refreshToken(config); // Needed to throw 401 on auth point and catch it in local catch handler
        return axios(originalRequest);
      } catch (e) {
        console.error('refresh axios catch', e);
        return Promise.reject(error);
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

  if (access.token) {
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
    console.warn('refreshTokenIfNeeded', e);
  }
}

export async function refreshToken(config: IConfig) {
  // const tryIndex = Math.round(Math.random()*10000)
  // console.log('Start refreshing', tryIndex, config)

  const { refresh } = await getCreds();
  if (!refresh) {
    // console.log('Refresh is empty', tryIndex, config)
    throw Error('Refresh not found in refreshToken');
  }

  if (!tokenUpdater) {
    // console.log('!tokenUpdater', Date.now(), tryIndex, tokenUpdater, config)
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
        // console.log('!tokenUpdater Success', tryIndex, config)
        const creds = _getCredsFromRes(res, config);
        return await saveCreds(creds);
      })
      .catch(e => {
        // console.log('!tokenUpdater Fail', tryIndex, config, e);
        throw e;
      })
      .finally(async () => {
        // console.log('!tokenUpdater Release updater', tryIndex, config)
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
  }
}

export async function getCreds() {
  try {
    const credsItem = storage && (await storage.getItem('creds'));
    const creds = JSON.parse(credsItem ? credsItem : '{}');

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
