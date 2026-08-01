// 后端 API 调用封装
const app = getApp();

function request(path, options = {}) {
  const token = app.globalData.token || wx.getStorageSync('token');
  const baseUrl = app.globalData.apiBase;
  const url = `${baseUrl}${path}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
      success(res) {
        const data = res.data;
        if (data.code === 0) {
          resolve(data.data);
        } else if (data.code === 401) {
          // 未登录或 token 过期
          wx.removeStorageSync('token');
          wx.removeStorageSync('username');
          wx.removeStorageSync('role');
          wx.redirectTo({ url: '/pages/login/login' });
          reject(new Error(data.msg));
        } else {
          reject(new Error(data.msg || '请求失败'));
        }
      },
      fail(err) {
        reject(new Error('网络错误，请检查网络连接'));
      }
    });
  });
}

module.exports = {
  // ── 认证 ──
  login: (username, password) =>
    request('/auth/dev_login', { method: 'POST', data: { username, password } }),

  register: (data) =>
    request('/auth/register', { method: 'POST', data }),

  getProfile: () => request('/auth/profile'),

  updateProfile: (data) =>
    request('/auth/profile', { method: 'PUT', data }),

  // ── 报刊 ──
  getNewspapers: (keyword = '') =>
    request(`/newspapers?keyword=${encodeURIComponent(keyword)}`),

  getNewspaperDetail: (id) => request(`/newspapers/${id}`),

  createNewspaper: (data) =>
    request('/newspapers', { method: 'POST', data }),

  updateNewspaper: (id, data) =>
    request(`/newspapers/${id}`, { method: 'PUT', data }),

  deleteNewspaper: (id) =>
    request(`/newspapers/${id}`, { method: 'DELETE' }),

  // ── 订单 ──
  getOrders: (keyword = '', status = '') =>
    request(`/orders?keyword=${encodeURIComponent(keyword)}&status=${status}`),

  getOrderDetail: (id) => request(`/orders/${id}`),

  createOrder: (data) =>
    request('/orders', { method: 'POST', data }),

  cancelOrder: (id) =>
    request(`/orders/${id}/cancel`, { method: 'POST' }),

  confirmOrder: (id) =>
    request(`/orders/${id}/confirm`, { method: 'POST' }),

  // ── 订户 ──
  getUsers: (keyword = '') =>
    request(`/users?keyword=${encodeURIComponent(keyword)}`),

  getUserDetail: (id) => request(`/users/${id}`),

  // ── 统计 ──
  getStats: () => request('/stats'),

  // ── 管理 ──
  getAdminUsers: () => request('/admin/users'),
  setUserRole: (userId, role) =>
    request(`/admin/users/${userId}/role`, { method: 'PUT', data: { role } }),
};
