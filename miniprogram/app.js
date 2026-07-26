// app.js
App({
  globalData: {
    token: '',
    username: '',
    role: '',
    isAdmin: false,
    // 后端 API 地址——上线后换成 Railway 域名
    apiBase: 'https://web-production-8197.up.railway.app/api',
  },
  onLaunch() {
    const token = wx.getStorageSync('token');
    const username = wx.getStorageSync('username');
    const role = wx.getStorageSync('role');
    if (token) {
      this.globalData.token = token;
      this.globalData.username = username;
      this.globalData.role = role;
      this.globalData.isAdmin = role === 'admin';
    }
  },
})
