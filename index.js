'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function(resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function(thisArg, body) {
    var _ = {
        label: 0,
        sent: function() {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: []
      },
      f,
      y,
      t,
      g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function() {
          return this;
        }),
      g
    );
    function verb(n) {
      return function(v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while (_)
        try {
          if (
            ((f = 1),
            y &&
              (t = op[0] & 2 ? y['return'] : op[0] ? y['throw'] || ((t = y['return']) && t.call(y), 0) : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!((t = _.trys), (t = t.length > 0 && t[t.length - 1])) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
exports.__esModule = true;
exports.getCreds = exports.clearCreds = exports.saveCreds = exports.refreshToken = exports.configureAxiosJWTInterseptors = void 0;
var tokenUpdater = null;
var tokenStatuses;
(function(tokenStatuses) {
  tokenStatuses[(tokenStatuses['expired'] = 10)] = 'expired';
  tokenStatuses[(tokenStatuses['bad'] = 11)] = 'bad';
  tokenStatuses[(tokenStatuses['incorrect'] = 12)] = 'incorrect';
  tokenStatuses[(tokenStatuses['revoked'] = 13)] = 'revoked';
  tokenStatuses[(tokenStatuses['badSignature'] = 14)] = 'badSignature';
})(tokenStatuses || (tokenStatuses = {}));
var preRefreshPeriod = 10;
var refreshInstance;
var storage;
var axios;
var convertToCamelCase;
var globalConfig;
function configureAxiosJWTInterseptors(config) {
  var _this = this;
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
    function(conf) {
      return __awaiter(_this, void 0, void 0, function() {
        return __generator(this, function(_a) {
          switch (_a.label) {
            case 0:
              return [4 /*yield*/, refreshTokenIfNeeded(config)];
            case 1:
              _a.sent();
              if (axios.defaults.headers.common['Authorization']) {
                conf.headers['Authorization'] = axios.defaults.headers.common['Authorization'];
              }
              return [2 /*return*/, conf];
          }
        });
      });
    },
    function(error) {
      return __awaiter(_this, void 0, void 0, function() {
        return __generator(this, function(_a) {
          throw error;
        });
      });
    }
  );
  axios.interceptors.response.use(
    function(response) {
      return __awaiter(_this, void 0, void 0, function() {
        return __generator(this, function(_a) {
          return [2 /*return*/, response];
        });
      });
    },
    function(error) {
      return __awaiter(_this, void 0, void 0, function() {
        var originalRequest, needRefresh, e_1;
        return __generator(this, function(_a) {
          switch (_a.label) {
            case 0:
              originalRequest = error.config;
              needRefresh =
                error &&
                error.response &&
                error.response.status === 401 &&
                error.response.data &&
                error.response.data.code === tokenStatuses.expired;
              if (!needRefresh) {
                throw error;
              }
              _a.label = 1;
            case 1:
              _a.trys.push([1, 3, , 4]);
              return [4 /*yield*/, refreshToken(config)];
            case 2:
              _a.sent();
              return [2 /*return*/, axios(originalRequest)];
            case 3:
              e_1 = _a.sent();
              console.error(e_1);
              throw error;
            case 4:
              return [2 /*return*/];
          }
        });
      });
    }
  );
}
exports.configureAxiosJWTInterseptors = configureAxiosJWTInterseptors;
function refreshTokenIfNeeded(config) {
  return __awaiter(this, void 0, void 0, function() {
    var _a, access, refresh, refreshCamel, accessCamel, now, _b, e_2;
    return __generator(this, function(_c) {
      switch (_c.label) {
        case 0:
          return [4 /*yield*/, getCreds()];
        case 1:
          (_a = _c.sent()), (access = _a.access), (refresh = _a.refresh);
          if (!access || !refresh) {
            return [2 /*return*/];
          }
          refreshCamel = camelCase(refresh);
          accessCamel = camelCase(access);
          if (!axios.defaults.headers.common['Authorization'] && access.token) {
            axios.defaults.headers.common['Authorization'] = 'Bearer ' + access.token;
          }
          _c.label = 2;
        case 2:
          _c.trys.push([2, 8, , 9]);
          now = Math.round(Date.now() / 1000);
          _b = true;
          switch (_b) {
            case refreshCamel.expiredAt < now:
              return [3 /*break*/, 3];
            case accessCamel.expiredAt < now:
              return [3 /*break*/, 4];
            case accessCamel.expiredAt < now + preRefreshPeriod:
              return [3 /*break*/, 4];
          }
          return [3 /*break*/, 6];
        case 3:
          return [3 /*break*/, 7];
        case 4: // if token expired soon
          return [4 /*yield*/, refreshToken(config)];
        case 5:
          _c.sent();
          return [3 /*break*/, 7];
        case 6:
          return [3 /*break*/, 7];
        case 7:
          return [3 /*break*/, 9];
        case 8:
          e_2 = _c.sent();
          console.warn('refreshTokenIfNeeded');
          return [3 /*break*/, 9];
        case 9:
          return [2 /*return*/];
      }
    });
  });
}
function refreshToken(config) {
  return __awaiter(this, void 0, void 0, function() {
    var refresh, refreshTokenKey;
    var _a;
    var _this = this;
    return __generator(this, function(_b) {
      switch (_b.label) {
        case 0:
          return [4 /*yield*/, getCreds()];
        case 1:
          refresh = _b.sent().refresh;
          if (!refresh) {
            throw Error();
          }
          if (!tokenUpdater) {
            refreshTokenKey = convertToCamelCase ? 'refreshToken' : 'refresh_token';
            delete refreshInstance.defaults.headers.common.Authorization;
            tokenUpdater = refreshInstance
              .put(config.refreshTokenEndpoint, ((_a = {}), (_a[refreshTokenKey] = refresh.token), _a), {
                baseURL: axios.defaults.baseURL
              })
              .then(function(res) {
                return __awaiter(_this, void 0, void 0, function() {
                  var creds;
                  return __generator(this, function(_a) {
                    switch (_a.label) {
                      case 0:
                        creds = _getCredsFromRes(res, config);
                        return [4 /*yield*/, saveCreds(creds)];
                      case 1:
                        return [2 /*return*/, _a.sent()];
                    }
                  });
                });
              })
              ['catch'](function(e) {
                return __awaiter(_this, void 0, void 0, function() {
                  return __generator(this, function(_a) {
                    switch (_a.label) {
                      case 0:
                        if (!(e && e.status === 401)) return [3 /*break*/, 2];
                        return [4 /*yield*/, clearCreds()];
                      case 1:
                        _a.sent();
                        _a.label = 2;
                      case 2:
                        throw e;
                    }
                  });
                });
              })
              ['finally'](function() {
                tokenUpdater = null;
              });
          }
          return [2 /*return*/, tokenUpdater];
      }
    });
  });
}
exports.refreshToken = refreshToken;
function saveCreds(creds) {
  return __awaiter(this, void 0, void 0, function() {
    var preparedCreds;
    return __generator(this, function(_a) {
      switch (_a.label) {
        case 0:
          if (!creds.access || !creds.access.token) {
            return [2 /*return*/];
          }
          axios.defaults.headers.common['Authorization'] = 'Bearer ' + creds.access.token;
          preparedCreds = convertToCamelCase ? camelCase(creds) : creds;
          globalConfig && globalConfig.onSaveCreds && globalConfig.onSaveCreds(preparedCreds);
          return [4 /*yield*/, storage.setItem('creds', JSON.stringify(preparedCreds))];
        case 1:
          return [2 /*return*/, _a.sent()];
      }
    });
  });
}
exports.saveCreds = saveCreds;
function clearCreds() {
  return __awaiter(this, void 0, void 0, function() {
    var e_3;
    return __generator(this, function(_a) {
      switch (_a.label) {
        case 0:
          _a.trys.push([0, 2, , 3]);
          delete axios.defaults.headers.common['Authorization'];
          globalConfig && globalConfig.onClearCreds && globalConfig.onClearCreds();
          return [4 /*yield*/, storage.setItem('creds', '')];
        case 1:
          return [2 /*return*/, _a.sent()];
        case 2:
          e_3 = _a.sent();
          console.warn('Error at clearCreds method!', e_3);
          return [2 /*return*/];
        case 3:
          return [2 /*return*/];
      }
    });
  });
}
exports.clearCreds = clearCreds;
function getCreds() {
  return __awaiter(this, void 0, void 0, function() {
    var credsItem, _a, creds, e_4;
    return __generator(this, function(_b) {
      switch (_b.label) {
        case 0:
          _b.trys.push([0, 3, , 4]);
          _a = storage;
          if (!_a) return [3 /*break*/, 2];
          return [4 /*yield*/, storage.getItem('creds')];
        case 1:
          _a = _b.sent();
          _b.label = 2;
        case 2:
          credsItem = _a || '{}';
          creds = JSON.parse(credsItem);
          globalConfig && globalConfig.onGetCreds && globalConfig.onGetCreds(creds);
          return [2 /*return*/, creds];
        case 3:
          e_4 = _b.sent();
          console.warn('Error at getCreds method!', e_4);
          return [2 /*return*/, {}];
        case 4:
          return [2 /*return*/];
      }
    });
  });
}
exports.getCreds = getCreds;
function camelCase(obj) {
  var newObj = {};
  for (var d in obj) {
    if (obj.hasOwnProperty(d)) {
      var newKey = d.replace(/(\_\w)/g, function(m) {
        return m[1].toUpperCase();
      });
      newObj[newKey] = obj[d];
    }
  }
  return newObj;
}
function _getCredsFromRes(res, config) {
  if (config.getCredsFromRefreshResponse) {
    var result = config.getCredsFromRefreshResponse(res);
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
