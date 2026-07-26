const api = require('../../utils/api');

Page({
  data: {
    stats: {
      orderCount: 0,
      revenue: '0.00',
      userCount: 0,
      newspaperCount: 0,
    },
    topNewspapers: [],
    typeDistribution: [],
    loading: true,
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    this.setData({ loading: true });
    api.getStats()
      .then(res => {
        const total = (res.total_users || 0) + (res.total_newspapers || 0) || 1;
        // �¥刊类型分布（如果有的话）
        const typeDist = (res.type_stats || []).map(t => ({
          type: t.type || '其他',
          count: t.count || 0,
          percent: Math.round((t.count / Math.max(res.total_subscriptions || 1, 1)) * 100),
        }));
        this.setData({
          stats: {
            orderCount: res.total_subscriptions || 0,
            revenue: Number(res.total_revenue || 0).toFixed(2),
            userCount: res.total_users || 0,
            newspaperCount: res.total_newspapers || 0,
          },
          topNewspapers: (res.top_newspapers || []).map(n => ({
            id: n.name,
            name: n.name,
            count: n.count,
          })),
          typeDistribution: typeDist,
          loading: false,
        });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '加载失�¥', icon: 'none' });
        this.setData({ loading: false });
      });
  },
});
