const api = require('../../utils/api');

Page({
  data: {
    newspapers: [],
    selectedNewspaper: null,
    selectedUserId: '',
    selectedUserIndex: -1,
    users: [],
    quantities: {},
    totalAmount: 0,
    remark: '',
    deliveryAddress: '',
    isAdmin: false,
    loading: true,
    submitting: false,
  },

  onLoad(options) {
    const app = getApp();
    const isAdmin = app.globalData.isAdmin || wx.getStorageSync('role') === 'admin';
    this.setData({ isAdmin });

    // 加载默认地址
    if (!isAdmin) {
      api.getProfile().then(res => {
        const subscriber = res.subscriber || {};
        this.setData({ deliveryAddress: subscriber.address || '' });
      }).catch(() => {});
    }

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
        const list = Array.isArray(res) ? res : (res.newspapers || res.list || res.records || []);
        const quantities = {};
        list.forEach(n => { quantities[n.id] = 0; });

        let selected = null;
        if (preselectId) {
          selected = list.find(n => n.id == preselectId) || null;
          if (selected) quantities[selected.id] = 1;
        }

        this.setData({
          newspapers: list,
          quantities,
          selectedNewspaper: selected,
          totalAmount: this.calcTotal(list, quantities),
        });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  loadUsers() {
    api.getUsers()
      .then(res => {
        const list = Array.isArray(res) ? res : (res.users || res.list || res.records || []);
        this.setData({ users: list });
      })
      .catch(() => {
        wx.showToast({ title: '加载订户失败', icon: 'none' });
      });
  },

  calcTotal(list, quantities) {
    return (list || []).reduce((sum, n) => {
      return sum + (parseFloat(n.price) || 0) * (quantities[n.id] || 0);
    }, 0);
  },

  selectNewspaper(e) {
    const id = e.currentTarget.dataset.id;
    const quantities = { ...this.data.quantities };
    if (!quantities[id] || quantities[id] === 0) {
      quantities[id] = 1;
    }
    this.setData({ quantities, totalAmount: this.calcTotal(this.data.newspapers, quantities) });
  },

  onQtyChange(e) {
    const { id, delta } = e.currentTarget.dataset;
    const quantities = { ...this.data.quantities };
    const current = quantities[id] || 0;
    const next = current + parseInt(delta);
    if (next < 0) return;
    quantities[id] = next;
    this.setData({ quantities, totalAmount: this.calcTotal(this.data.newspapers, quantities) });
  },

  onUserSelect(e) {
    const index = parseInt(e.detail.value) || 0;
    const user = this.data.users[index];
    this.setData({
      selectedUserIndex: index,
      selectedUserId: user ? user.user_id : '',
    });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  onAddressInput(e) {
    this.setData({ deliveryAddress: e.detail.value });
  },

  onSubmit() {
    const items = this.data.newspapers
      .filter(n => (this.data.quantities[n.id] || 0) > 0)
      .map(n => ({
        newspaper_id: n.id,
        qty: this.data.quantities[n.id],
      }));

    if (items.length === 0) {
      wx.showToast({ title: '请至少选择一种报刊', icon: 'none' });
      return;
    }

    const data = { items, note: this.data.remark, delivery_address: this.data.deliveryAddress };
    if (this.data.isAdmin && this.data.selectedUserId) {
      data.user_id = this.data.selectedUserId;
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
        wx.showToast({ title: err.message || '下单失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  },
});
