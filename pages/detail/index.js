Page({
  data: {
    item: null,
    loading: true,
    showContact: false,
    isOwner: false,
    fromMine: false
  },

  onLoad(options) {
    this.itemId = options.id;
    this.fromMine = options.from === 'mine';
    this.loadDetail();
  },

  async loadDetail() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'item',
        data: {
          action: 'getDetail',
          itemId: this.itemId
        }
      });

      const item = res.result.data;
      const openid = res.result.openid;
      
      const formattedItem = {
        _id: item._id,
        _openid: item._openid,
        title: item.title,
        desc: item.desc,
        contact: item.contact,
        images: item.images,
        status: item.status,
        createdAt: this.formatDate(item.createdAt)
      };

      this.setData({
        item: formattedItem,
        loading: false,
        isOwner: openid === item._openid,
        fromMine: this.fromMine
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

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.item.images
    });
  },

  showContact() {
    this.setData({ showContact: true });
  },

  copyContact() {
    const contact = this.data.item.contact;
    
    wx.setClipboardData({
      data: contact,
      success: function() {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  callPhone() {
    const contact = this.data.item.contact;
    
    if (this.isPhoneNumber(contact)) {
      wx.makePhoneCall({
        phoneNumber: contact,
        fail: function(err) {
          if (err.errMsg.indexOf('cancel') >= 0) {
            return;
          }
          wx.showToast({
            title: '拨号失败',
            icon: 'none'
          });
        }
      });
    } else {
      wx.showToast({
        title: '不是有效的手机号',
        icon: 'none'
      });
    }
  },

  isPhoneNumber(str) {
    const phoneReg = /^1[3-9]\d{9}$/;
    return phoneReg.test(str.trim());
  },

  goToEdit() {
    wx.navigateTo({
      url: '/pages/edit/index?id=' + this.itemId
    });
  },

  async toggleStatus() {
    const newStatus = this.data.item.status === 'on' ? 'off' : 'on';

    try {
      await wx.cloud.callFunction({
        name: 'item',
        data: {
          action: 'updateStatus',
          itemId: this.itemId,
          status: newStatus
        }
      });

      wx.showToast({
        title: newStatus === 'on' ? '已上架' : '已下架',
        icon: 'success'
      });

      this.loadDetail();
    } catch (err) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  async deleteItem() {
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
            itemId: this.itemId
          }
        });

        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });

        setTimeout(function() {
          wx.navigateBack();
        }, 1500);
      } catch (err) {
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      }
    }
  },

  async report() {
    const res = await wx.showModal({
      title: '举报',
      content: '确定要举报此物品吗？'
    });

    if (res.confirm) {
      try {
        await wx.cloud.callFunction({
          name: 'item',
          data: {
            action: 'report',
            itemId: this.itemId
          }
        });

        wx.showToast({
          title: '举报成功',
          icon: 'success'
        });
      } catch (err) {
        wx.showToast({
          title: '举报失败',
          icon: 'none'
        });
      }
    }
  },

  onShareAppMessage() {
    if (this.data.item) {
      return {
        title: this.data.item.title,
        path: '/pages/detail/index?id=' + this.itemId,
        imageUrl: this.data.item.images[0]
      };
    }
  }
});
