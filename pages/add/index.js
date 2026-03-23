const tags = ['母婴', '日常', '美妆', '食品', '其它'];

const expireOptions = [
  { label: '30分钟', value: 0.5/24 },
  { label: '1天', value: 1 },
  { label: '7天', value: 7 },
  { label: '1个月', value: 30 },
  { label: '1年', value: 365 }
];

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
    expireIndex: 4,
    expireOptions: expireOptions,
    submitting: false,
    isFirstShow: true,
    loading: false,
    showTagModal: false
  },

  onLoad(options) {
    this.setData({ isFirstShow: true });
    wx.setNavigationBarTitle({ title: '录入信息' });
  },

  onShow() {
    if (!this.data.isFirstShow) {
      this.resetForm();
    }
    this.setData({ isFirstShow: false });
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
      expireIndex: 4,
      submitting: false
    });
  },

  showTagPicker() {
    this.setData({ showTagModal: true });
  },

  hideTagPicker() {
    this.setData({ showTagModal: false });
  },

  preventClose() {},

  selectTag(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      tagIndex: index,
      tag: tags[index],
      showTagModal: false
    });
  },

  selectExpire(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ expireIndex: index });
  },

  calculateExpireAt() {
    const option = expireOptions[this.data.expireIndex];
    const now = new Date();
    const days = option.value;
    now.setTime(now.getTime() + days * 24 * 60 * 60 * 1000);
    return now.getTime();
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

  async uploadImages(files, index, that) {
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
    
    let uploadPath = filePath;
    try {
      const compressRes = await new Promise((resolve, reject) => {
        wx.compressImage({
          src: filePath,
          quality: 70,
          success: resolve,
          fail: reject
        });
      });
      uploadPath = compressRes.tempFilePath;
    } catch (err) {
      console.log('压缩失败，使用原图');
    }

    try {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: uploadPath
      });

      const currentImages = that.data.images;
      if (currentImages.length < 3) {
        currentImages.push(uploadRes.fileID);
        that.setData({
          images: currentImages
        });
      }
      that.uploadImages(files, index + 1, that);
    } catch (err) {
      console.error('上传失败', err);
      wx.hideLoading();
      wx.showToast({
        title: '上传失败',
        icon: 'none',
        duration: 2000
      });
    }
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

  async submit() {
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
      wx.showToast({ title: '请输入详细描述', icon: 'none', duration: 2000 });
      return;
    }

    if (!this.data.contact.trim()) {
      wx.showToast({ title: '请输入用户唯一标识', icon: 'none', duration: 2000 });
      return;
    }

    if (this.data.images.length === 0) {
      wx.showToast({ title: '请至少上传一张图片', icon: 'none', duration: 2000 });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '录入中...' });

    try {
      const expireAt = this.calculateExpireAt();
      const expireDays = expireOptions[this.data.expireIndex].value;
      const res = await wx.cloud.callFunction({
        name: 'item',
        data: {
          action: 'create',
          title: this.data.title,
          desc: this.data.desc,
          contact: this.data.contact,
          images: this.data.images,
          tag: this.data.tag,
          value: valueResult.value,
          expireAt: expireAt,
          expireDays: expireDays
        }
      });

      wx.hideLoading();
      this.setData({ submitting: false });
      
      if (res.result && res.result.errCode === 0) {
        wx.showToast({ title: '录入成功', icon: 'success' });
        setTimeout(() => {
          this.resetForm();
          this.setData({ isFirstShow: true });
          wx.switchTab({ url: '/pages/home/index' });
        }, 1500);
      } else {
        const errorMsg = (res.result && res.result.errMsg) || '录入失败';
        wx.showToast({ title: errorMsg, icon: 'none', duration: 3000 });
      }
    } catch (err) {
      console.error('录入失败', err);
      wx.hideLoading();
      this.setData({ submitting: false });
      
      let errorMsg = '录入失败';
      if (err.errMsg && err.errMsg.indexOf('FunctionName') >= 0) {
        errorMsg = '云函数未部署';
      } else if (err.errMsg && err.errMsg.indexOf('env not exists') >= 0) {
        errorMsg = '云开发环境未配置';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      wx.showToast({ title: errorMsg, icon: 'none', duration: 3000 });
    }
  }
});
