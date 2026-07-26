const api = require('../../utils/api');

Page({
  data: {
    username: '',
    password: '',
    loading: false,
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  onLogin() {
    const { username, password } = this.data;
    if (!username.trim()) {
      wx.showToast({ title: '请输入用户名', icon: 'none' });
      return;
    }
    if (!password.trim()) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    api.login(username.trim(), password.trim())
      .then(res => {
        const { token, username: uname, role } = res;
        wx.setStorageSync('token', token);
        wx.setStorageSync('username', uname);
        wx.setStorageSync('role', role);

        const app = getApp();
        app.globalData.token = token;
        app.globalData.username = uname;
        app.globalData.role = role;
        app.globalData.isAdmin = role === 'admin';

        wx.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' });
        }, 500);
      })
      .catch(err => {
        wx.showToast({ title: err.message || '登录失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  onRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  },
});
