const api = require('../../utils/api');

const STATUS_TEXT = { 1: '待处理', 2: '已确认', 3: '已取消' };
const STATUS_CLASS = { 1: 'badge-pending', 2: 'badge-confirmed', 3: 'badge-cancelled' };

Page({
  data: {
    order: {
      order_id: 0,
      user_name: '',
      user_phone: '',
      order_date: '',
      total_amount: '0.00',
      status: 1,
      statusText: '',
      statusClass: '',
      note: '',
      subscriptions: [],
    },
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
        const o = res.order || res;
        const order = {
          order_id: o.order_id || id,
          user_name: o.user_name || '-',
          user_phone: o.user_phone || '-',
          order_date: o.order_date || '',
          total_amount: Number(o.total_amount || 0).toFixed(2),
          status: o.status || 1,
          statusText: STATUS_TEXT[o.status] || '',
          statusClass: STATUS_CLASS[o.status] || '',
          note: o.note || '',
          subscriptions: o.subscriptions || [],
        };
        this.setData({ order, loading: false });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '加载失�¥', icon: 'none' });
        this.setData({ loading: false });
      });
  },

  onConfirm() {
    const id = this.data.order.order_id;
    wx.showModal({
      title: '确认订单',
      content: '确定要确认�¥订单吗？',
      success: (res) => {
        if (res.confirm) {
          api.confirmOrder(id)
            .then(() => {
              wx.showToast({ title: '已确认', icon: 'success' });
              this.loadDetail(id);
            })
            .catch(err => {
              wx.showToast({ title: err.message || '操作失�¥', icon: 'none' });
            });
        }
      },
    });
  },

  onCancel() {
    const id = this.data.order.order_id;
    wx.showModal({
      title: '取消订单',
      content: '确定要取消�¥订单吗？',
      success: (res) => {
        if (res.confirm) {
          api.cancelOrder(id)
            .then(() => {
              wx.showToast({ title: '已取消', icon: 'success' });
              this.loadDetail(id);
            })
            .catch(err => {
              wx.showToast({ title: err.message || '操作失�¥', icon: 'none' });
            });
        }
      },
    });
  },

  onDelete() {
    const id = this.data.order.order_id;
    wx.showModal({
      title: '删除订单',
      content: '确定要删除�¥订单吗？此操作不可撤销。',
      success: (res) => {
        if (res.confirm) {
          api.cancelOrder(id)
            .then(() => {
              wx.showToast({ title: '已删除', icon: 'success' });
              setTimeout(() => wx.navigateBack(), 500);
            })
            .catch(err => {
              wx.showToast({ title: err.message || '操作失�¥', icon: 'none' });
            });
        }
      },
    });
  },
});
