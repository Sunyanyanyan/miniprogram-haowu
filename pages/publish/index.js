const tags = ['家用电器', '电子数码', '家居用品', '宠物用品', '运动器材', '图书音像', '厨房用品', '服装鞋帽', '美妆个护', '票务卡券', '食品饮料', '珠宝配饰', '其他'];

Page({
  data: {
    images: [],
    title: '',
    desc: '',
    contact: '',
    tag: '',
    tagIndex: -1,
    tags: tags,
    value: '',
    submitting: false,
    isFirstShow: true
  },

  onLoad() {
    this.setData({ isFirstShow: true });
  },

  onShow() {
    if (this.data.isFirstShow) {
      this.resetForm();
      this.setData({ isFirstShow: false });
    }
  },

  resetForm() {
    this.setData({
      images: [],
      title: '',
      desc: '',
      contact: '',
      tag: '',
      tagIndex: -1,
      value: '',
      submitting: false
    });
  },

  onTagChange(e) {
    const index = e.detail.value;
    this.setData({
      tagIndex: index,
      tag: tags[index]
    });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onValueInput(e) {
    let value = e.detail.value;
    value = value.replace(/[^\d.]/g, '');
    let parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    this.setData({ value: value });
  },

  onDescInput(e) {
    this.setData({ desc: e.detail.value });
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  chooseImage() {
    const currentCount = this.data.images.length;
    
    if (currentCount >= 3) {
      wx.showToast({
        title: '最多上传3张图片',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const maxCount = 3 - currentCount;
    const that = this;

    wx.chooseMedia({
      count: maxCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const tempFiles = res.tempFiles;
        
        if (that.data.images.length + tempFiles.length > 3) {
          wx.showToast({
            title: '最多上传3张图片',
            icon: 'none',
            duration: 2000
          });
          return;
        }
        
        wx.showLoading({ title: '上传中...' });

        that.uploadImages(tempFiles, 0, that);
      }
    });
  },

  uploadImages(files, index, that) {
    if (index >= files.length || that.data.images.length >= 3) {
      wx.hideLoading();
      wx.showToast({
        title: '上传成功',
        icon: 'success',
        duration: 1500
      });
      return;
    }

    const filePath = files[index].tempFilePath;
    const cloudPath = 'items/' + Date.now() + '-' + Math.random().toString(36).substr(2) + '.jpg';
    
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: function(uploadRes) {
        const currentImages = that.data.images;
        if (currentImages.length < 3) {
          currentImages.push(uploadRes.fileID);
          that.setData({
            images: currentImages
          });
        }
        that.uploadImages(files, index + 1, that);
      },
      fail: function(err) {
        wx.hideLoading();
        console.error('上传失败', err);
        wx.showToast({
          title: '上传失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [];
    for (let i = 0; i < this.data.images.length; i++) {
      if (i !== index) {
        images.push(this.data.images[i]);
      }
    }
    this.setData({ images: images });
  },

  validateValue(value) {
    if (!value || value === '') {
      return { valid: false, message: '请输入好物值' };
    }
    
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return { valid: false, message: '好物值必须大于0' };
    }
    
    const decimalPart = value.split('.')[1];
    if (decimalPart && decimalPart.length > 2) {
      return { valid: false, message: '好物值最多两位小数' };
    }
    
    return { valid: true, value: num };
  },

  submit() {
    if (this.data.tagIndex < 0) {
      wx.showToast({ title: '请选择标签', icon: 'none', duration: 2000 });
      return;
    }

    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none', duration: 2000 });
      return;
    }

    const valueResult = this.validateValue(this.data.value);
    if (!valueResult.valid) {
      wx.showToast({ title: valueResult.message, icon: 'none', duration: 2000 });
      return;
    }

    if (!this.data.desc.trim()) {
      wx.showToast({ title: '请输入描述', icon: 'none', duration: 2000 });
      return;
    }

    if (!this.data.contact.trim()) {
      wx.showToast({ title: '请输入联系信息', icon: 'none', duration: 2000 });
      return;
    }

    if (this.data.images.length === 0) {
      wx.showToast({ title: '请至少上传一张图片', icon: 'none', duration: 2000 });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '登记中...' });

    const that = this;
    wx.cloud.callFunction({
      name: 'item',
      data: {
        action: 'create',
        title: this.data.title,
        desc: this.data.desc,
        contact: this.data.contact,
        images: this.data.images,
        tag: this.data.tag,
        value: valueResult.value
      },
      success: function(res) {
        wx.hideLoading();
        that.setData({ submitting: false });
        
        if (res.result && res.result.errCode === 0) {
          wx.showToast({
            title: '登记成功',
            icon: 'success'
          });

          setTimeout(function() {
            that.resetForm();
            that.setData({ isFirstShow: true });
            wx.switchTab({ url: '/pages/home/index' });
          }, 1500);
        } else {
          const errorMsg = (res.result && res.result.errMsg) || '登记失败';
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          });
        }
      },
      fail: function(err) {
        console.error('登记失败', err);
        wx.hideLoading();
        that.setData({ submitting: false });
        
        let errorMsg = '登记失败';
        if (err.errMsg && err.errMsg.indexOf('FunctionName') >= 0) {
          errorMsg = '云函数未部署';
        } else if (err.errMsg && err.errMsg.indexOf('env not exists') >= 0) {
          errorMsg = '云开发环境未配置';
        } else if (err.message) {
          errorMsg = err.message;
        }
        
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        });
      }
    });
  }
});
