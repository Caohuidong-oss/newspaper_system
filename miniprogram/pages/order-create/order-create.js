const api = require('../../utils/api');

Page({
  data: {
    newspapers: [],
    selectedNewspaper: null,
    selectedUserId: '',
    users: [],
    quantities: {},
    remark: '',
    isAdmin: false,
    loading: true,
    submitting: false,
  },

  onLoad(options) {
    const app = getApp();
    const isAdmin = app.globalData.isAdmin || wx.getStorageSync('role') === 'admin';
    this.setData({ isAdmin });

    const preselectId = options.newspaperId;
    this.loadNewspapers(preselectId);

    if (isAdmin) {
      this.loadUsers();
    }
  },

  loadNewspapers(preselectId) {
    this.setData({ loading: true });
    api.getNewspapers()
      .then(res => {
        const list = Array.isArray(res) ? res : (res.list || res.records || []);
        const quantities = {};
        list.forEach(n => { quantities[n.id] = 0; });

        let selected = null;
        if (preselectId) {
          selected = list.find(n => n.id == preselectId) || null;
          if (selected) quantities[selected.id] = 1;
        }

        this.setData({ newspapers: list, quantities, selectedNewspaper: selected });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '加载失�¥', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  loadUsers() {
    api.getUsers()
      .then(res => {
        const list = Array.isArray(res) ? res : (res.list || res.records || []);
        this.setData({ users: list });
      })
      .catch(() => {});
  },

  selectNewspaper(e) {
    const id = e.currentTarget.dataset.id;
    const newspaper = this.data.newspapers.find(n => n.id === id);
    this.setData({ selectedNewspaper: newspaper });

    const quantities = { ...this.data.quantities };
    if (!quantities[id] || quantities[id] === 0) {
      quantities[id] = 1;
    }
    this.setData({ quantities });
  },

  onQtyChange(e) {
    const { id, delta } = e.currentTarget.dataset;
    const quantities = { ...this.data.quantities };
    const current = quantities[id] || 0;
    const next = current + parseInt(delta);
    if (next < 0) return;
    quantities[id] = next;
    this.setData({ quantities });
  },

  onUserSelect(e) {
    const userId = e.detail.value;
    this.setData({ selectedUserId: userId });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  getSubtotal(id) {
    const newspaper = this.data.newspapers.find(n => n.id === id);
    const qty = this.data.quantities[id] || 0;
    return newspaper ? (newspaper.price * qty) : 0;
  },

  getTotal() {
    return this.data.newspapers.reduce((sum, n) => {
      return sum + this.getSubtotal(n.id);
    }, 0);
  },

  onSubmit() {
    const items = this.data.newspapers
      .filter(n => (this.data.quantities[n.id] || 0) > 0)
      .map(n => ({
        newspaperId: n.id,
        quantity: this.data.quantities[n.id],
      }));

    if (items.length === 0) {
      wx.showToast({ title: '请至少选择一种�¥刊', icon: 'none' });
      return;
    }

    const data = { items, remark: this.data.remark };
    if (this.data.isAdmin && this.data.selectedUserId) {
      data.userId = this.data.selectedUserId;
    }

    this.setData({ submitting: true });
    api.createOrder(data)
      .then(() => {
        wx.showToast({ title: '下单成功', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/orders/orders' });
        }, 500);
      })
      .catch(err => {
        wx.showToast({ title: err.message || '下单失�¥', icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  },
});
