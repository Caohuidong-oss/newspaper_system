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

  /**
   * 隐私授权检查（微信要求收集用户信息前必须获取授权）
   * 调用时机：注册/下单等收集信息操作前
   * 返回 Promise，resolve(true) = 已授权，reject = 用户拒绝
   */
  checkPrivacyAuthorization() {
    return new Promise((resolve, reject) => {
      if (!wx.getPrivacySetting) {
        // 基础库不支持（老版本），直接放行
        resolve(true);
        return;
      }
      wx.getPrivacySetting({
        success: res => {
          if (res.needAuthorization) {
            wx.showModal({
              title: '用户隐私保护提示',
              content: '使用本小程序需要您同意《隐私政策》以收集和处理您的必要信息（用户名、手机号、收货地址等）。\n\n是否同意？',
              confirmText: '同意并继续',
              cancelText: '不同意',
              success: modalRes => {
                if (modalRes.confirm) {
                  if (wx.requirePrivacyAuthorize) {
                    wx.requirePrivacyAuthorize({
                      success: () => resolve(true),
                      fail: () => reject(new Error('未授权')),
                    });
                  } else {
                    resolve(true);
                  }
                } else {
                  reject(new Error('未同意隐私协议'));
                }
              },
            });
          } else {
            resolve(true);
          }
        },
        fail: () => resolve(true),
      });
    });
  },
})
