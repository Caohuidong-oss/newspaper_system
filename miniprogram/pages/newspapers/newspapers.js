const api = require('../../utils/api');

Page({
  data: {
    keyword: '',
    newspapers: [],
    loading: true,
    isAdmin: false,
  },

  onShow() {
    const app = getApp();
    const isAdmin = app.globalData.isAdmin || wx.getStorageSync('role') === 'admin';
    this.setData({ isAdmin });
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
        const list = Array.isArray(res)
          ? res
          : (res.newspapers || res.list || res.records || []);
        this.setData({ newspapers: list });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  goToCreateOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-create/order-create?newspaperId=${id}` });
  },

  goToCreate() {
    wx.navigateTo({ url: '/pages/newspaper-edit/newspaper-edit' });
  },

  goToEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/newspaper-edit/newspaper-edit?id=${id}` });
  },

  onManage(e) {
    const { id, name } = e.currentTarget.dataset;
    const item = this.data.newspapers.find(n => n.id == id);
    const actions = item && item.is_available
      ? ['下架', '编辑', '删除']
      : ['重新上架', '编辑', '删除'];
    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        const idx = res.tapIndex;
        if (idx === 0) {
          if (item && item.is_available) {
            this.takeDown(item);
          } else {
            this.relist(item);
          }
        } else if (idx === 1) {
          this.goToEdit({ currentTarget: { dataset: { id } } });
        } else if (idx === 2) {
          this.doDelete(item);
        }
      },
    });
  },

  takeDown(item) {
    wx.showModal({
      title: '下架报刊',
      content: `确定下架「${item.name}」吗？下架后用户将无法订阅。`,
      success: (res) => {
        if (res.confirm) {
          api.updateNewspaper(item.id, { available_until: '2000-01-01' })
            .then(() => {
              wx.showToast({ title: '已下架', icon: 'success' });
              this.loadNewspapers();
            })
            .catch(err => {
              wx.showToast({ title: err.message || '操作失败', icon: 'none' });
            });
        }
      },
    });
  },

  relist(item) {
    wx.showModal({
      title: '重新上架',
      content: `确定重新上架「${item.name}」吗？`,
      success: (res) => {
        if (res.confirm) {
          api.updateNewspaper(item.id, { available_until: null })
            .then(() => {
              wx.showToast({ title: '已上架', icon: 'success' });
              this.loadNewspapers();
            })
            .catch(err => {
              wx.showToast({ title: err.message || '操作失败', icon: 'none' });
            });
        }
      },
    });
  },

  doDelete(item) {
    wx.showModal({
      title: '删除报刊',
      content: `确定永久删除「${item.name}」吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          api.deleteNewspaper(item.id)
            .then(() => {
              wx.showToast({ title: '已删除', icon: 'success' });
              this.loadNewspapers();
            })
            .catch(err => {
              wx.showToast({ title: err.message || '操作失败', icon: 'none' });
            });
        }
      },
    });
  },
});
