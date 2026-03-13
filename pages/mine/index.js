const app = getApp();

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    myItems: [],
    loading: true,
    clickCount: 0
  },

  onLoad() {
    this.checkUserInfo();
  },

  onShow() {
    if (this.data.hasUserInfo) {
      this.loadMyItems();
    }
  },

  checkUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      });
      this.loadMyItems();
    }
  },

  getUserProfile() {
    const that = this;
    wx.getUserProfile({
      desc: '用于发布物品和联系',
      success: function(res) {
        wx.setStorageSync('userInfo', res.userInfo);
        that.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
        that.loadMyItems();
      },
      fail: function() {
        wx.showToast({
          title: '授权失败',
          icon: 'none'
        });
      }
    });
  },

  async loadMyItems() {
    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'item',
        data: {
          action: 'getMyList'
        }
      });

      const items = res.result.data || [];
      const formattedItems = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        formattedItems.push({
          _id: item._id,
          _openid: item._openid,
          title: item.title,
          desc: item.desc,
          contact: item.contact,
          images: item.images,
          status: item.status,
          createdAt: this.formatDate(item.createdAt),
          updatedAt: this.formatDate(item.updatedAt)
        });
      }

      this.setData({
        myItems: formattedItems,
        loading: false
      });
    } catch (err) {
      console.error('加载失败', err);
      this.setData({ loading: false });
    }
  },

  formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/detail/index?id=' + id + '&from=mine'
    });
  },

  goToEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/edit/index?id=' + id
    });
  },

  async toggleStatus(e) {
    const id = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;
    const newStatus = status === 'on' ? 'off' : 'on';

    try {
      await wx.cloud.callFunction({
        name: 'item',
        data: {
          action: 'updateStatus',
          itemId: id,
          status: newStatus
        }
      });

      wx.showToast({
        title: newStatus === 'on' ? '已上架' : '已下架',
        icon: 'success'
      });

      this.loadMyItems();
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
          name: 'item',
          data: {
            action: 'delete',
            itemId: id
          }
        });

        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });

        this.loadMyItems();
      } catch (err) {
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      }
    }
  },

  onVersionTap() {
    this.setData({ clickCount: this.data.clickCount + 1 });

    if (this.data.clickCount >= 5) {
      this.checkAdmin();
      this.setData({ clickCount: 0 });
    }
  },

  async checkAdmin() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: { action: 'checkAdmin' }
      });

      if (res.result.isAdmin) {
        wx.navigateTo({ url: '/pages/admin/index' });
      } else {
        wx.showToast({
          title: '无权限',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.showToast({
        title: '校验失败',
        icon: 'none'
      });
    }
  }
});
