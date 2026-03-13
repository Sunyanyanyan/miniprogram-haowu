Page({
  data: {
    items: [],
    loading: true,
    stats: {
      total: 0,
      on: 0,
      off: 0
    }
  },

  onLoad() {
    this.loadAllItems();
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
      const stats = {
        total: items.length,
        on: items.filter(item => item.status === 'on').length,
        off: items.filter(item => item.status === 'off').length
      };

      this.setData({
        items,
        stats,
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
      } catch (err) {
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      }
    }
  }
});
