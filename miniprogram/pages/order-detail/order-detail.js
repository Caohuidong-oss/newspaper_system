const api = require('../../utils/api');

Page({
  data: {
    order: null,
    isAdmin: false,
    loading: true,
  },

  onLoad(options) {
    const app = getApp();
    const isAdmin = app.globalData.isAdmin || wx.getStorageSync('role') === 'admin';
    this.setData({ isAdmin });
    if (options.id) {
      this.loadDetail(options.id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
    }
  },

  loadDetail(id) {
    this.setData({ loading: true });
    api.getOrderDetail(id)
      .then(res => {
        this.setData({ order: res });
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

  onConfirm() {
    const id = this.data.order.id;
    wx.showModal({
      title: '确认订单',
      content: '确定要确认该订单吗？',
      success: (res) => {
        if (res.confirm) {
          api.confirmOrder(id)
            .then(() => {
              wx.showToast({ title: '已确认', icon: 'success' });
              this.loadDetail(id);
            })
            .catch(err => {
              wx.showToast({ title: err.message || '操作失败', icon: 'none' });
            });
        }
      },
    });
  },

  onCancel() {
    const id = this.data.order.id;
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      success: (res) => {
        if (res.confirm) {
          api.cancelOrder(id)
            .then(() => {
              wx.showToast({ title: '已取消', icon: 'success' });
              this.loadDetail(id);
            })
            .catch(err => {
              wx.showToast({ title: err.message || '操作失败', icon: 'none' });
            });
        }
      },
    });
  },

  onDelete() {
    const id = this.data.order.id;
    wx.showModal({
      title: '删除订单',
      content: '确定要删除该订单吗？此操作不可撤销。',
      success: (res) => {
        if (res.confirm) {
          api.cancelOrder(id)
            .then(() => {
              wx.showToast({ title: '已删除', icon: 'success' });
              setTimeout(() => wx.navigateBack(), 500);
            })
            .catch(err => {
              wx.showToast({ title: err.message || '操作失败', icon: 'none' });
            });
        }
      },
    });
  },
});
