const api = require('../../utils/api');

Page({
  data: {
    tabs: [
      { key: '', label: '全部' },
      { key: 'pending', label: '待处理' },
      { key: 'confirmed', label: '已确认' },
      { key: 'cancelled', label: '已取消' },
    ],
    activeTab: 0,
    orders: [],
    loading: true,
  },

  onShow() {
    this.loadOrders();
  },

  onTabTap(e) {
    const index = e.currentTarget.dataset.index;
    if (index === this.data.activeTab) return;
    this.setData({ activeTab: index, loading: true });
    this.loadOrders();
  },

  loadOrders() {
    const status = this.data.tabs[this.data.activeTab].key;
    api.getOrders('', status)
      .then(res => {
        const list = Array.isArray(res) ? res : (res.list || res.records || []);
        this.setData({ orders: list });
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

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` });
  },
});
