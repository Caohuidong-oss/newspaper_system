const api = require('../../utils/api');

Page({
  data: {
    id: null,
    name: '',
    type: '',
    price: '',
    period: '',
    description: '',
    availableFrom: '',
    availableUntil: '',
    submitting: false,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      wx.setNavigationBarTitle({ title: '编辑报刊' });
      this.loadDetail(options.id);
    } else {
      wx.setNavigationBarTitle({ title: '新增报刊' });
    }
  },

  loadDetail(id) {
    api.getNewspaperDetail(id)
      .then(res => {
        const n = res.newspaper || res;
        this.setData({
          name: n.name || '',
          type: n.type || '',
          price: n.price != null ? String(n.price) : '',
          period: n.period || '',
          description: n.description || '',
          availableFrom: n.available_from || '',
          availableUntil: n.available_until || '',
        });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      });
  },

  onNameInput(e) { this.setData({ name: e.detail.value }); },
  onTypeInput(e) { this.setData({ type: e.detail.value }); },
  onPriceInput(e) { this.setData({ price: e.detail.value }); },
  onPeriodInput(e) { this.setData({ period: e.detail.value }); },
  onDescInput(e) { this.setData({ description: e.detail.value }); },
  onFromInput(e) { this.setData({ availableFrom: e.detail.value }); },
  onUntilInput(e) { this.setData({ availableUntil: e.detail.value }); },

  onSubmit() {
    const name = (this.data.name || '').trim();
    const price = parseFloat(this.data.price);
    if (!name) {
      wx.showToast({ title: '请输入报刊名称', icon: 'none' });
      return;
    }
    if (!price || price <= 0) {
      wx.showToast({ title: '请输入有效单价', icon: 'none' });
      return;
    }

    const payload = {
      name,
      type: this.data.type,
      price,
      period: this.data.period,
      description: this.data.description,
      available_from: this.data.availableFrom || null,
      available_until: this.data.availableUntil || null,
    };

    this.setData({ submitting: true });
    const req = this.data.id
      ? api.updateNewspaper(this.data.id, payload)
      : api.createNewspaper(payload);
    req.then(() => {
        wx.showToast({ title: this.data.id ? '已保存' : '已创建', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 500);
      })
      .catch(err => {
        wx.showToast({ title: err.message || '保存失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  },
});
