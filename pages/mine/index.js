const app = getApp();

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    myItems: [],
    filteredItems: [],
    loading: true,
    isAdmin: false,
    currentTab: 'on',
    onCount: 0,
    offCount: 0
  },

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    if (this.data.hasUserInfo) {
      this.loadMyItems();
    }
  },

  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      });
      this.loadMyItems();
      this.checkAdmin();
    }
  },

  getUserProfile() {
    const that = this;
    wx.getUserProfile({
      desc: '用于登记好物和沟通',
      success: function(res) {
        wx.setStorageSync('userInfo', res.userInfo);
        that.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
        that.loadMyItems();
        that.checkAdmin();
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
      let onCount = 0;
      let offCount = 0;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        formattedItems.push({
          _id: item._id,
          _openid: item._openid,
          title: item.title,
          desc: item.desc,
          contact: item.contact,
          images: item.images,
          tag: item.tag,
          status: item.status,
          value: item.value,
          createdAt: this.formatDate(item.createdAt),
          updatedAt: this.formatDate(item.updatedAt)
        });
        
        if (item.status === 'on') {
          onCount++;
        } else {
          offCount++;
        }
      }

      const filteredItems = formattedItems.filter(function(item) {
        return item.status === this.data.currentTab;
      }.bind(this));

      this.setData({
        myItems: formattedItems,
        filteredItems: filteredItems,
        onCount: onCount,
        offCount: offCount,
        loading: false
      });
    } catch (err) {
      console.error('加载失败', err);
      this.setData({ loading: false });
    }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    const filteredItems = this.data.myItems.filter(function(item) {
      return item.status === tab;
    });
    
    this.setData({
      currentTab: tab,
      filteredItems: filteredItems
    });
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
        title: newStatus === 'on' ? '已展示' : '已隐藏',
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

  goToAdmin() {
    wx.navigateTo({ url: '/pages/admin/index' });
  },

  checkAdmin() {
    const that = this;
    const timer = setTimeout(function() {
      that.setData({ isAdmin: false });
    }, 3000);
    
    wx.cloud.callFunction({
      name: 'admin',
      data: { action: 'checkAdmin' },
      success: function(res) {
        clearTimeout(timer);
        if (res.result && res.result.isAdmin) {
          that.setData({ isAdmin: true });
        }
      },
      fail: function() {
        clearTimeout(timer);
        that.setData({ isAdmin: false });
      }
    });
  }
});
