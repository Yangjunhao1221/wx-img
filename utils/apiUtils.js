/**
 * API请求工具类
 * 封装微信小程序网络请求
 */

// 接口基础URL
const BASE_URL = 'https://webapi.designkit.com/v1';

// 通用请求参数
const COMMON_PARAMS = {
  client_id: '1189857523',
  gid: '19a581f3719e4b-035dd247cdae9a8-26061851-2073600-19a581f371a37cd',
  country_code: 'cn',
  channel: '',
  enter_source: 'MTXX-WEB'
};

/**
 * 生成唯一请求ID
 * 格式: 时间戳_随机数
 */
function generateRequestUniqueId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${timestamp}_${random}`;
}

/**
 * 封装wx.request
 * @param {Object} options 请求配置
 * @returns {Promise}
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const {
      url,
      method = 'GET',
      data = {},
      header = {},
      timeout = 10000
    } = options;

    wx.request({
      url,
      method,
      data,
      header: {
        'content-type': 'application/json',
        ...header
      },
      timeout,
      success: (res) => {
        if (res.statusCode === 200) {
          if (res.data && res.data.code === 0) {
            resolve(res.data.data);
          } else {
            reject(new Error(res.data?.message || '请求失败'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 获取海报类型列表
 * @returns {Promise<Array>} 类型列表
 */
function getPosterCategories() {
  const url = `${BASE_URL}/category/list`;
  const params = {
    ...COMMON_PARAMS,
    count: 0,
    code: 'background_special_ids',
    request_unique_id: generateRequestUniqueId()
  };

  // 将参数拼接到URL
  const queryString = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');

  return request({
    url: `${url}?${queryString}`,
    method: 'GET'
  }).then(data => {
    // 返回类型数组
    return data.data || [];
  });
}

/**
 * 获取指定类型的海报列表
 * @param {Number} categoryId 类型ID
 * @param {Number} count 获取数量，默认50
 * @param {String} cursor 分页游标
 * @returns {Promise<Object>} 海报列表数据
 */
function getPostersByCategory(categoryId, count = 50, cursor = '') {
  const url = `${BASE_URL}/category/materials`;
  const params = {
    ...COMMON_PARAMS,
    id: categoryId,
    count: count,
    cursor: cursor,
    request_unique_id: generateRequestUniqueId()
  };

  // 将参数拼接到URL
  const queryString = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');

  return request({
    url: `${url}?${queryString}`,
    method: 'GET'
  }).then(data => {
    // 返回海报数据
    return {
      materials: data.materials || [],
      cursor: data.cursor || ''
    };
  });
}

// 导出API方法
module.exports = {
  getPosterCategories,
  getPostersByCategory,
  generateRequestUniqueId
};

