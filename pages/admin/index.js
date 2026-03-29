Page({
  data: {
    items: [],
    loading: true,
    stats: {
      userCount: 0,
      total: 0,
      on: 0,
      off: 0
    },
    analytics: {
      pageViews: {},
      totalRecords: 0
    }
  },

  onLoad() {
    this.loadAllItems();
    this.loadStats();
    this.loadAnalytics();
  },

  async loadAnalytics() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'analytics',
        data: {
          action: 'getStats'
        }
      });

      if (res.result && res.result.data) {
        this.setData({
          analytics: {
            pageViews: res.result.data.pageViewStats || {},
            totalRecords: res.result.data.totalRecords || 0
          }
        });
      }
    } catch (err) {
      console.error('加载埋点数据失败', err);
    }
  },

  async loadStats() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'getStats'
        }
      });

      if (res.result && res.result.data) {
        this.setData({
          stats: {
            userCount: res.result.data.userCount || 0,
            total: res.result.data.totalItems || 0,
            on: res.result.data.onItems || 0,
            off: res.result.data.offItems || 0
          }
        });
      }
    } catch (err) {
      console.error('加载统计失败', err);
    }
  },

  async loadAllItems() {
    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'getAllItems'
        }
      });

      const items = res.result.data || [];

      this.setData({
        items,
        loading: false
      });
    } catch (err) {
      console.error('加载失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  async toggleStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    const newStatus = status === 'on' ? 'off' : 'on';

    try {
      await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'forceUpdateStatus',
          itemId: id,
          status: newStatus
        }
      });

      wx.showToast({
        title: '操作成功',
        icon: 'success'
      });

      this.loadAllItems();
      this.loadStats();
    } catch (err) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  async deleteItem(e) {
    const id = e.currentTarget.dataset.id;

    const res = await wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除吗？'
    });

    if (res.confirm) {
      try {
        await wx.cloud.callFunction({
          name: 'admin',
          data: {
            action: 'forceDelete',
            itemId: id
          }
        });

        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });

        this.loadAllItems();
        this.loadStats();
      } catch (err) {
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      }
    }
  }
});
