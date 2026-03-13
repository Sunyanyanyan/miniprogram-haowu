Page({
  data: {
    images: [],
    title: '',
    desc: '',
    contact: '',
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
      submitting: false
    });
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

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ desc: e.detail.value });
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  submit() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none', duration: 2000 });
      return;
    }

    if (!this.data.desc.trim()) {
      wx.showToast({ title: '请输入描述', icon: 'none', duration: 2000 });
      return;
    }

    if (!this.data.contact.trim()) {
      wx.showToast({ title: '请输入联系方式', icon: 'none', duration: 2000 });
      return;
    }

    if (this.data.images.length === 0) {
      wx.showToast({ title: '请至少上传一张图片', icon: 'none', duration: 2000 });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '发布中...' });

    const that = this;
    wx.cloud.callFunction({
      name: 'item',
      data: {
        action: 'create',
        title: this.data.title,
        desc: this.data.desc,
        contact: this.data.contact,
        images: this.data.images
      },
      success: function(res) {
        wx.hideLoading();
        that.setData({ submitting: false });
        
        if (res.result && res.result.errCode === 0) {
          wx.showToast({
            title: '发布成功',
            icon: 'success'
          });

          setTimeout(function() {
            that.resetForm();
            that.setData({ isFirstShow: true });
            wx.switchTab({ url: '/pages/home/index' });
          }, 1500);
        } else {
          const errorMsg = (res.result && res.result.errMsg) || '发布失败';
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          });
        }
      },
      fail: function(err) {
        console.error('发布失败', err);
        wx.hideLoading();
        that.setData({ submitting: false });
        
        let errorMsg = '发布失败';
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
