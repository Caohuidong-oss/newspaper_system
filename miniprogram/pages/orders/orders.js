const api = require('../../utils/api');

const STATUS_TEXT = { 1: '待处理', 2: '已确认', 3: '已取消' };
const STATUS_CLASS = { 1: 'badge-pending', 2: 'badge-confirmed', 3: 'badge-cancelled' };

Page({
  data: {
    tabs: [
      { key: '', label: '全部', statusValue: '' },
      { key: 'pending', label: '待处理', statusValue: '1' },
      { key: 'confirmed', label: '已确认', statusValue: '2' },
      { key: 'cancelled', label: '已取消', statusValue: '3' },
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
    const status = this.data.tabs[this.data.activeTab].statusValue;
    api.getOrders('', status)
      .then(res => {
        const raw = Array.isArray(res) ? res : (res.orders || res.list || []);
        const list = raw.map(o => this.normalizeOrder(o));
        this.setData({ orders: list, loading: false });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '加载失�¥', icon: 'none' });
        this.setData({ loading: false });
      });
  },

  normalizeOrder(o) {
    return {
      id: o.order_id,
      orderNo: '#' + o.order_id,
      user_name: o.user_name || '',
      dateShort: (o.order_date || '').substring(0, 10),
      totalAmount: Number(o.total_amount || 0).toFixed(2),
      status: o.status,
      statusText: STATUS_TEXT[o.status] || '',
      statusClass: STATUS_CLASS[o.status] || '',
    };
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` });
  },
});
