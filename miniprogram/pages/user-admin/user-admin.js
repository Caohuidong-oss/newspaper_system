const api = require('../../utils/api');

Page({
  data: {
    users: [],
    loading: true,
  },

  onShow() {
    this.loadUsers();
  },

  loadUsers() {
    this.setData({ loading: true });
    api.getAdminUsers()
      .then(res => {
        const list = Array.isArray(res) ? res : (res.users || []);
        this.setData({ users: list });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  onToggleRole(e) {
    const { id, username, role } = e.currentTarget.dataset;
    const newRole = role === 'admin' ? 'user' : 'admin';
    const action = role === 'admin' ? '取消管理员权限' : '提升为管理员';
    wx.showModal({
      title: action,
      content: `确定要${action}「${username}」吗？`,
      success: (res) => {
        if (res.confirm) {
          api.setUserRole(id, newRole)
            .then(() => {
              wx.showToast({ title: '已更新', icon: 'success' });
              this.loadUsers();
            })
            .catch(err => {
              wx.showToast({ title: err.message || '操作失败', icon: 'none' });
            });
        }
      },
    });
  },
});
