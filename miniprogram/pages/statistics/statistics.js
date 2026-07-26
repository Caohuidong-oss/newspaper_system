const api = require('../../utils/api');

Page({
  data: {
    stats: null,
    topNewspapers: [],
    typeDistribution: [],
    loading: true,
  },

  onLoad() {
    this.loadStats();
  },

  loadStats() {
    this.setData({ loading: true });
    api.getStats()
      .then(res => {
        this.setData({
          stats: res,
          topNewspapers: res.topNewspapers || [],
          typeDistribution: res.typeDistribution || [],
        });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  getTypePercent(type) {
    const total = this.data.stats?.newspaperCount || 1;
    const count = this.data.typeDistribution.find(t => t.type === type)?.count || 0;
    return (count / total * 100).toFixed(1);
  },

  getTypeCount(type) {
    return this.data.typeDistribution.find(t => t.type === type)?.count || 0;
  },
});
