const app = getApp();

Page({
  data: {},

  onLoad() {
    const isAdmin = app.globalData.isAdmin || wx.getStorageSync('role') === 'admin';
    this.setData({ isAdmin });
  },

  agree() {
    wx.setStorageSync('agreed_agreement', '1');
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/register/register' }) });
  },

  backToRegister() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/register/register' }) });
  },
});
