const api = require('../../utils/api');

Page({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    realName: '',
    phone: '',
    address: '',
    loading: false,
  },

  onUsernameInput(e) { this.setData({ username: e.detail.value }); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); },
  onConfirmInput(e) { this.setData({ confirmPassword: e.detail.value }); },
  onRealNameInput(e) { this.setData({ realName: e.detail.value }); },
  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
  onAddressInput(e) { this.setData({ address: e.detail.value }); },

  onRegister() {
    const { username, password, confirmPassword, realName, phone, address } = this.data;

    if (!username.trim()) {
      wx.showToast({ title: '请输入用户名', icon: 'none' });
      return;
    }
    if (username.length < 3) {
      wx.showToast({ title: '用户名至少 3 个字符', icon: 'none' });
      return;
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }
    if (password.length < 6) {
      wx.showToast({ title: '密码至少 6 位', icon: 'none' });
      return;
    }
    if (password !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    api.register({
      username: username.trim(),
      password: password,
      real_name: realName.trim() || username.trim(),
      phone: phone.trim(),
      address: address.trim(),
    })
      .then(res => {
        const { token, username: uname, role } = res;
        wx.setStorageSync('token', token);
        wx.setStorageSync('username', uname);
        wx.setStorageSync('role', role);

        const app = getApp();
        app.globalData.token = token;
        app.globalData.username = uname;
        app.globalData.role = role;
        app.globalData.isAdmin = false;

        wx.showToast({ title: '注册成功！', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' });
        }, 800);
      })
      .catch(err => {
        wx.showToast({ title: err.message || '注册失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  onBackToLogin() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/login/login' }) });
  },
});
