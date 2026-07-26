const api = require('../../utils/api');

Page({
  data: {
    username: '',
    role: '',
    isAdmin: false,
    subscriberName: '',
    subscriberPhone: '',
    subscriberAddress: '',
    editable: false,
    loading: false,
  },

  onShow() {
    const app = getApp();
    const username = app.globalData.username || wx.getStorageSync('username');
    const role = app.globalData.role || wx.getStorageSync('role');
    const isAdmin = role === 'admin';
    this.setData({ username, role, isAdmin });
    this.loadProfile();
  },

  loadProfile() {
    this.setData({ loading: true });
    api.getProfile()
      .then(res => {
        this.setData({
          subscriberName: res.name || res.subscriberName || '',
          subscriberPhone: res.phone || res.subscriberPhone || '',
          subscriberAddress: res.address || res.subscriberAddress || '',
        });
      })
      .catch(() => {})
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  toggleEdit() {
    this.setData({ editable: !this.data.editable });
  },

  onNameInput(e) {
    this.setData({ subscriberName: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ subscriberPhone: e.detail.value });
  },

  onAddressInput(e) {
    this.setData({ subscriberAddress: e.detail.value });
  },

  onSave() {
    wx.showToast({ title: '资料已保存（模拟）', icon: 'success' });
    this.setData({ editable: false });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.globalData.token = '';
          app.globalData.username = '';
          app.globalData.role = '';
          app.globalData.isAdmin = false;
          wx.removeStorageSync('token');
          wx.removeStorageSync('username');
          wx.removeStorageSync('role');
          wx.redirectTo({ url: '/pages/login/login' });
        }
      },
    });
  },

  goToStatistics() {
    wx.navigateTo({ url: '/pages/statistics/statistics' });
  },
});
