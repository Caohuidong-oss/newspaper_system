const app = getApp();

Page({
  data: {
    isAdmin: false,
  },

  onLoad() {
    const isAdmin = app.globalData.isAdmin || wx.getStorageSync('role') === 'admin';
    this.setData({ isAdmin });
  },

  backToRegister() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/register/register' }) });
  },
});
