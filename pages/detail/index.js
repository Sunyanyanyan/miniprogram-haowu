Page({
  data: {
    item: null,
    loading: true,
    showContact: false,
    isOwner: false,
    fromMine: false,
    expireText: '',
    showShareModal: false,
    shareImagePath: ''
  },

  onLoad(options) {
    this.itemId = options.id;
    this.fromMine = options.from === 'mine';
    this.loadDetail();
  },

  onHide() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  },

  onUnload() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
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
        tag: item.tag,
        status: item.status,
        value: item.value,
        type: item.type || 'clue',
        expireAt: item.expireAt,
        createdAt: this.formatDate(item.createdAt)
      };

      this.setData({
        item: formattedItem,
        loading: false,
        isOwner: openid === item._openid,
        fromMine: this.fromMine
      });

      this.startCountdown();
    } catch (err) {
      console.error('加载失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  startCountdown() {
    if (!this.data.item.expireAt) {
      this.setData({ expireText: '' });
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const expireAt = this.data.item.expireAt;
      const diff = expireAt - now;

      if (diff <= 0) {
        this.setData({ expireText: '已下架' });
        clearInterval(this.countdownTimer);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let text = '';
      if (days > 0) {
        text = '剩余 ' + days + '天 ' + hours + '小时';
      } else if (hours > 0) {
        text = '剩余 ' + hours + '小时 ' + minutes + '分钟';
      } else if (minutes > 0) {
        text = '剩余 ' + minutes + '分钟 ' + seconds + '秒';
      } else {
        text = '剩余 ' + seconds + '秒';
      }

      this.setData({ expireText: text });
    };

    updateCountdown();

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    this.countdownTimer = setInterval(updateCountdown, 1000);
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
    wx.setClipboardData({
      data: this.data.item.contact,
      success: function() {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        });
      }
    });
  },

  callContact() {
    const contact = this.data.item.contact;
    if (/^1[3-9]\d{9}$/.test(contact)) {
      wx.makePhoneCall({
        phoneNumber: contact
      });
    } else {
      wx.showToast({
        title: '不是手机号',
        icon: 'none'
      });
    }
  },

  goToEdit() {
    wx.navigateTo({
      url: '/pages/add/index?id=' + this.itemId
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
        title: newStatus === 'on' ? '已展示' : '已隐藏',
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

  async showShareMenu() {
    wx.showLoading({ title: '生成中...' });
    
    try {
      const imagePath = await this.drawShareCard();
      this.setData({
        showShareModal: true,
        shareImagePath: imagePath
      });
      wx.hideLoading();
    } catch (err) {
      console.error('生成分享图失败', err);
      wx.hideLoading();
      wx.showToast({
        title: '生成失败',
        icon: 'none'
      });
    }
  },

  hideShareModal() {
    this.setData({ showShareModal: false });
  },

  preventClose() {},

  async drawShareCard() {
    const item = this.data.item;
    const ctx = wx.createCanvasContext('shareCanvas');
    const canvasWidth = 300;
    const canvasHeight = 400;

    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (item.images && item.images.length > 0) {
      const imageInfo = await this.getImageInfo(item.images[0]);
      ctx.drawImage(imageInfo.path, 15, 15, 270, 180);
    }

    ctx.setFillStyle('#333333');
    ctx.setFontSize(18);
    const title = item.title.length > 15 ? item.title.substring(0, 15) + '...' : item.title;
    ctx.fillText(title, 15, 225);

    ctx.setFillStyle('#9B59B6');
    ctx.setFontSize(24);
    ctx.fillText('参考值：' + item.value, 15, 265);

    if (item.tag) {
      ctx.setFillStyle('#f5f5f5');
      ctx.fillRect(15, 280, 80, 30);
      ctx.setFillStyle('#666666');
      ctx.setFontSize(14);
      ctx.fillText(item.tag, 25, 300);
    }

    ctx.setFillStyle('#999999');
    ctx.setFontSize(12);
    ctx.fillText('扫码查看详情', 15, 360);

    ctx.setFillStyle('#666666');
    ctx.setFontSize(10);
    ctx.fillText('好物墙', 15, 380);

    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvasId: 'shareCanvas',
        success: (res) => resolve(res.tempFilePath),
        fail: (err) => reject(err)
      });
    });
  },

  getImageInfo(fileID) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: fileID,
        success: resolve,
        fail: reject
      });
    });
  },

  async saveToAlbum() {
    try {
      const res = await wx.saveImageToPhotosAlbum({
        filePath: this.data.shareImagePath
      });
      
      wx.showToast({
        title: '已保存到相册',
        icon: 'success'
      });
    } catch (err) {
      if (err.errMsg.indexOf('auth deny') >= 0) {
        wx.showModal({
          title: '提示',
          content: '需要授权保存图片权限',
          success: (res) => {
            if (res.confirm) {
            wx.openSetting();
            }
          }
        });
      } else {
        wx.showToast({
          title: '保存失败',
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
  },

  onShareTimeline() {
    if (this.data.item) {
      return {
        title: this.data.item.title,
        query: 'id=' + this.itemId,
        imageUrl: this.data.item.images[0]
      };
    }
  }
});
