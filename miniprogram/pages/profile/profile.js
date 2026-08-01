const api = require('../../utils/api');

Page({
  data: {
    username: '',
    role: '',
    isAdmin: false,
    initialLetter: '',
    subscriberName: '',
    subscriberPhone: '',
    subscriberAddress: '',
    editable: false,
    loading: false,
    saving: false,
  },

  onShow() {
    const app = getApp();
    const username = app.globalData.username || wx.getStorageSync('username');
    const role = app.globalData.role || wx.getStorageSync('role');
    const isAdmin = role === 'admin';
    this.setData({
      username,
      role,
      isAdmin,
      initialLetter: username ? username.charAt(0).toUpperCase() : '',
    });
    this.loadProfile();
  },

  loadProfile() {
    this.setData({ loading: true });
    api.getProfile()
      .then(res => {
        const sub = res.subscriber || {};
        this.setData({
          subscriberName: sub.real_name || sub.name || '',
          subscriberPhone: sub.phone || '',
          subscriberAddress: sub.address || '',
        });
      })
      .catch(() => {
        wx.showToast({ title: '加载资料失败', icon: 'none' });
      })
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
    const name = (this.data.subscriberName || '').trim();
    if (!name) {
      wx.showToast({ title: '姓名不能为空', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    api.updateProfile({
      real_name: name,
      phone: this.data.subscriberPhone,
      address: this.data.subscriberAddress,
    })
      .then(() => {
        wx.showToast({ title: '资料已保存', icon: 'success' });
        this.setData({ editable: false });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '保存失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ saving: false });
      });
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

  goToUserAdmin() {
    wx.navigateTo({ url: '/pages/user-admin/user-admin' });
  },
});
