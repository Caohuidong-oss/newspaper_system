const api = require('../../utils/api');

const STATUS_TEXT = { 1: '待处理', 2: '已确认', 3: '已取消' };
const STATUS_CLASS = { 1: 'badge-pending', 2: 'badge-confirmed', 3: 'badge-cancelled' };

Page({
  data: {
    username: '',
    role: '',
    isAdmin: false,
    stats: {
      userCount: 0,
      newspaperCount: 0,
      orderCount: 0,
      revenue: '0.00',
      myOrderCount: 0,
      mySpending: '0.00',
    },
    recentOrders: [],
    topNewspapers: [],
    loading: true,
  },

  onShow() {
    const app = getApp();
    const username = app.globalData.username || wx.getStorageSync('username') || '';
    const role = app.globalData.role || wx.getStorageSync('role') || '';
    const isAdmin = role === 'admin';

    this.setData({ username, role, isAdmin });
    this.loadStats();
  },

  loadStats() {
    this.setData({ loading: true });
    const isAdmin = this.data.isAdmin;

    // 加载统计
    api.getStats()
      .then(res => {
        this.setData({
          stats: {
            userCount: res.total_users || 0,
            newspaperCount: res.total_newspapers || 0,
            orderCount: res.total_orders || 0,
            revenue: Number(res.total_revenue || 0).toFixed(2),
            myOrderCount: res.total_orders || 0,
            mySpending: Number(res.total_revenue || 0).toFixed(2),
          },
          topNewspapers: (res.top_newspapers || []).slice(0, 5),
        });
      })
      .catch(err => {
        console.warn('stats load failed:', err.message);
      });

    // 加载最近订单
    api.getOrders()
      .then(data => {
        const list = Array.isArray(data) ? data : (data.orders || []);
        const recent = list.slice(0, 5).map(o => ({
          id: o.order_id,
          userName: (o.user && o.user.real_name) || o.user_real_name || '',
          dateShort: o.date_short || (o.order_date || '').substring(0, 10),
          timeShort: o.time_short || (o.order_date || '').substring(11, 16),
          totalAmount: Number(o.total_amount || 0).toFixed(2),
          status: o.status,
          statusText: STATUS_TEXT[o.status] || '',
          statusClass: STATUS_CLASS[o.status] || '',
        }));
        this.setData({ recentOrders: recent, loading: false });
      })
      .catch(err => {
        console.warn('orders load failed:', err.message);
        this.setData({ loading: false });
      });
  },

  // 统计卡片跳转（管理员）
  goToNewspapersAdmin() { wx.switchTab({ url: '/pages/newspapers/newspapers' }); },
  goToUsers() { wx.navigateTo({ url: '/pages/statistics/statistics' }); },  // 简化处理
  goToOrdersAdmin() { wx.switchTab({ url: '/pages/orders/orders' }); },
  goToStatistics() { wx.navigateTo({ url: '/pages/statistics/statistics' }); },

  // 统计卡片跳转（普通）
  goToNewspapers() { wx.switchTab({ url: '/pages/newspapers/newspapers' }); },
  goToOrders() { wx.switchTab({ url: '/pages/orders/orders' }); },
});
