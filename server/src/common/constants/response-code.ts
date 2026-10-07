/**
 * 统一响应码（与文档 §6 约定：{ code, message, data, traceId }）
 * 业务成功使用 0（或 200），错误使用 http 风格码。
 */
export enum ResCode {
  SUCCESS = 0,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  VALIDATION_ERROR = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

export const ResMessage: Record<number, string> = {
  [ResCode.SUCCESS]: 'success',
  [ResCode.BAD_REQUEST]: '请求参数错误',
  [ResCode.UNAUTHORIZED]: '未登录或登录已过期',
  [ResCode.FORBIDDEN]: '无权限访问',
  [ResCode.NOT_FOUND]: '资源不存在',
  [ResCode.CONFLICT]: '资源冲突',
  [ResCode.VALIDATION_ERROR]: '数据校验失败',
  [ResCode.TOO_MANY_REQUESTS]: '请求过于频繁',
  [ResCode.INTERNAL_ERROR]: '服务器内部错误',
  [ResCode.SERVICE_UNAVAILABLE]: '服务暂不可用',
};
