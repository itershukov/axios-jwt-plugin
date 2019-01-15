import { IAsyncStorage } from 'universal-storage';
import {AxiosInstance, AxiosStatic} from 'axios';

const refreshTokenURL = '/api/refresh-token';

let tokenUpdater: Promise<any> | null = null;

interface IConfig {
  storage: IAsyncStorage,
  axios: AxiosStatic,
  refreshTokenURL?: string
}

enum tokenStatuses {
  expired = 10,
  bad = 11,
  incorrect = 12,
  revoked = 13,
  badSignature = 14
}

const PRE_REFRESH_PERIOD = 10;

let refreshInstance: AxiosInstance;

let storage: IAsyncStorage;
let axios: AxiosStatic;

export function configureAxiosJWTInterseptors(config: IConfig) {

  if (storage && axios) {
    return;
  }

  storage = config.storage;
  axios = config.axios;
  refreshInstance = axios.create({
    timeout: 1000
  });

  axios.interceptors.request.use(
    async conf => {
      await _refreshTokenIfNeeded();
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
        await _refreshToken();
        return axios(originalRequest);
      } catch (e) {
        console.error(e);
        throw error;
      }
    }
  );
}

async function _refreshTokenIfNeeded() {
  const { access, refresh } = await getCreds();

  if (!access || !refresh) {
    return;
  }

  try {
    const now = Date.now() / 1000;
    switch (true) {
      case !!access.token:
        axios.defaults.headers.common['Authorization'] = `Bearer ${access.token}`;
        break;
      case refresh.expired_at < now:
        break;
      case access.expired_at < now:
        await _refreshToken();
        break;
      case access.expired_at < now + PRE_REFRESH_PERIOD: // if token expired soon
        _refreshToken();
        break;
      default:
        break;
    }
  } catch (e) {
    console.warn('_refreshTokenIfNeeded');
  }
}

async function _refreshToken() {
  const { refresh } = await getCreds();
  if (!refresh) {
    throw Error();
  }

  if (!tokenUpdater) {
    tokenUpdater = refreshInstance
      .post(
        refreshTokenURL,
        {
          refresh_token: refresh.token
        },
        {
          baseURL: axios.defaults.baseURL
        }
      )
      .then(async res => {
        return await saveCreds(res.data.data);
      })
      .catch(async e => {
        await clearCreds();
        throw e;
      })
      .finally(() => {
        tokenUpdater = null;
      });
  }

  return tokenUpdater;
}

export async function saveCreds(creds: any) {
  if (!creds.access || !creds.access.token) {
    return;
  }

  axios.defaults.headers.common['Authorization'] = `Bearer ${creds.access.token}`;
  return await storage.setItem('creds', JSON.stringify(creds));
}

export async function clearCreds() {
  delete axios.defaults.headers.common['Authorization'];
  return await storage.setItem('creds', '');
}

export async function getCreds() {
  try {
    const credsItem = (await storage.getItem('creds')) || '{}';
    const creds = JSON.parse(credsItem);
    return creds;
  } catch (e) {
    console.warn('getCreds', e);
    return {};
  }
}

