const api = require('../../utils/api');

Page({
  data: {
    keyword: '',
    newspapers: [],
    loading: true,
  },

  onShow() {
    this.loadNewspapers();
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.loadNewspapers();
  },

  loadNewspapers() {
    this.setData({ loading: true });
    api.getNewspapers(this.data.keyword.trim())
      .then(res => {
        const list = Array.isArray(res) ? res : (res.list || res.records || []);
        this.setData({ newspapers: list });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '鍔犺浇澶辫触', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  goToCreateOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-create/order-create?newspaperId=${id}` });
  },
});
