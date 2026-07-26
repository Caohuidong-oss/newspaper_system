const api = require('../../utils/api');

Page({
  data: {
    username: '',
    role: '',
    isAdmin: false,
    stats: null,
    recentOrders: [],
    loading: true,
  },

  onShow() {
    const app = getApp();
    const username = app.globalData.username || wx.getStorageSync('username');
    const role = app.globalData.role || wx.getStorageSync('role');
    const isAdmin = role === 'admin';

    this.setData({ username, role, isAdmin });
    this.loadStats();
  },

  loadStats() {
    this.setData({ loading: true });
    api.getStats()
      .then(res => {
        const orders = (res.recentOrders || []).slice(0, 5);
        this.setData({ stats: res, recentOrders: orders });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  getStatusText(status) {
    const map = { pending: '待处理', confirmed: '已确认', cancelled: '已取消' };
    return map[status] || status;
  },

  getStatusClass(status) {
    const map = { pending: 'badge-pending', confirmed: 'badge-confirmed', cancelled: 'badge-cancelled' };
    return map[status] || '';
  },

  goToNewspapers() {
    wx.switchTab({ url: '/pages/newspapers/newspapers' });
  },

  goToOrders() {
    wx.switchTab({ url: '/pages/orders/orders' });
  },

  goToStatistics() {
    wx.navigateTo({ url: '/pages/statistics/statistics' });
  },
});
