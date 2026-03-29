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
    offCount: 0,
    isFirstShow: true
  },

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    wx.setNavigationBarTitle({ title: '我的' });
    if (this.data.hasUserInfo && !this.data.isFirstShow) {
      this.loadMyItems();
    }
    this.setData({ isFirstShow: false });
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
      desc: '用于录入信息和沟通',
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
      const now = Date.now();
      const formattedItems = [];
      let onCount = 0;
      let offCount = 0;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isExpired = item.expireAt && item.expireAt < now;
        const effectiveStatus = isExpired ? 'off' : item.status;
        
        formattedItems.push({
          _id: item._id,
          _openid: item._openid,
          title: item.title,
          desc: item.desc,
          contact: item.contact,
          images: item.images,
          tag: item.tag,
          status: item.status,
          effectiveStatus: effectiveStatus,
          isExpired: isExpired,
          value: item.value,
          createdAt: this.formatDate(item.createdAt),
          updatedAt: this.formatDate(item.updatedAt)
        });
        
        if (effectiveStatus === 'on') {
          onCount++;
        } else {
          offCount++;
        }
      }

      const filteredItems = formattedItems.filter(function(item) {
        return item.effectiveStatus === this.data.currentTab;
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
      return item.effectiveStatus === tab;
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
    const expired = e.currentTarget.dataset.expired;
    const effectiveStatus = expired ? 'off' : status;
    const newStatus = effectiveStatus === 'on' ? 'off' : 'on';

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

  async shareItem(e) {
    const id = e.currentTarget.dataset.id;
    const title = e.currentTarget.dataset.title;
    const images = e.currentTarget.dataset.images;
    
    try {
      wx.showLoading({ title: '生成中...' });
      
      const ctx = wx.createCanvasContext('shareCanvas');
      const canvasWidth = 300;
      const canvasHeight = 400;

      ctx.setFillStyle('#ffffff');
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      if (images && images.length > 0) {
        const imageUrl = images[0];
        const imageInfo = await new Promise(function(resolve, reject) {
          wx.getImageInfo({
            src: imageUrl,
            success: resolve,
            fail: reject
          });
        });
        ctx.drawImage(imageInfo.path, 15, 15, 270, 180);
      }

      ctx.setFillStyle('#333333');
      ctx.setFontSize(18);
      const displayTitle = title.length > 15 ? title.substring(0, 15) + '...' : title;
      ctx.fillText(displayTitle, 15, 225);

      ctx.setFillStyle('#9B59B6');
      ctx.setFontSize(24);
      ctx.fillText('好物值：查看详情', 15, 265);

      ctx.setFillStyle('#999999');
      ctx.setFontSize(12);
      ctx.fillText('扫码查看详情', 15, 360);

      ctx.setFillStyle('#666666');
      ctx.setFontSize(10);
      ctx.fillText('好物墙', 15, 380);

      const tempFilePath = await new Promise(function(resolve, reject) {
        wx.canvasToTempFilePath({
          canvasId: 'shareCanvas',
          success: function(res) { resolve(res.tempFilePath); },
          fail: reject
        });
      });

      wx.hideLoading();

      wx.showModal({
        title: '分享',
        content: '分享图片已生成，是否保存到相册？',
        success: function(res) {
          if (res.confirm) {
            wx.saveImageToPhotosAlbum({
              filePath: tempFilePath,
              success: function() {
                wx.showToast({ title: '已保存', icon: 'success' });
              },
              fail: function() {
                wx.showToast({ title: '保存失败', icon: 'none' });
              }
            });
          }
        }
      });
    } catch (err) {
      console.error('分享失败', err);
      wx.hideLoading();
      wx.showToast({ title: '生成失败', icon: 'none' });
    }
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
