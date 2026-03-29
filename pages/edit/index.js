const tags = ['口粮', '穿搭', '洗护', '玩趣', '妈咪'];

const expireOptions = [
  { label: '30分钟', value: 0.5/24 },
  { label: '1小时', value: 1/24 },
  { label: '1天', value: 1 },
  { label: '1月', value: 30 },
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
    itemId: '',
    loading: true,
    showTagModal: false,
    uploading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ itemId: options.id });
      this.loadDetail(options.id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(function() {
        wx.navigateBack();
      }, 1500);
    }
  },

  async loadDetail(itemId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'item',
        data: {
          action: 'getDetail',
          itemId: itemId
        }
      });

      if (res.result && res.result.errCode === 0) {
        const item = res.result.data;
        const tagIndex = tags.indexOf(item.tag);
        
        let expireIndex = 4;
        if (item.expireDays) {
          const idx = expireOptions.findIndex(function(opt) {
            return opt.value === item.expireDays;
          });
          if (idx >= 0) expireIndex = idx;
        }
        
        this.setData({
          images: item.images || [],
          title: item.title || '',
          desc: item.desc || '',
          contact: item.contact || '',
          tag: item.tag || '',
          tagIndex: tagIndex >= 0 ? tagIndex : -1,
          value: item.value ? String(item.value) : '',
          expireIndex: expireIndex,
          loading: false
        });
      } else {
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    } catch (err) {
      console.error('加载失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
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

  goBack() {
    wx.navigateBack();
  },

  chooseImage() {
    if (this.data.uploading) {
      wx.showToast({ title: '正在上传中...', icon: 'none' });
      return;
    }

    const currentCount = this.data.images.length;
    
    if (currentCount >= 3) {
      wx.showToast({ title: '最多上传3张图片', icon: 'none' });
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
          wx.showToast({ title: '最多上传3张图片', icon: 'none' });
          return;
        }
        
        that.setData({ uploading: true });
        wx.showLoading({ title: '上传中...' });
        that.uploadImages(tempFiles, 0, that);
      }
    });
  },

  async uploadImages(files, index, that) {
    if (index >= files.length || that.data.images.length >= 3) {
      wx.hideLoading();
      that.setData({ uploading: false });
      wx.showToast({ title: '上传成功', icon: 'success' });
      return;
    }

    const filePath = files[index].tempFilePath;
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 8);
    const cloudPath = 'items/' + timestamp + '_' + randomStr + '_' + index + '.jpg';
    
    let uploadPath = filePath;
    try {
      const compressRes = await new Promise(function(resolve, reject) {
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
        that.setData({ images: currentImages });
      }
      that.uploadImages(files, index + 1, that);
    } catch (err) {
      console.error('上传失败', err);
      wx.showToast({ title: '第' + (index + 1) + '张图片上传失败', icon: 'none' });
      that.uploadImages(files, index + 1, that);
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
      wx.showToast({ title: '请选择标签', icon: 'none' });
      return;
    }

    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }

    const valueResult = this.validateValue(this.data.value);
    if (!valueResult.valid) {
      wx.showToast({ title: valueResult.message, icon: 'none' });
      return;
    }

    if (!this.data.desc.trim()) {
      wx.showToast({ title: '请输入详细描述', icon: 'none' });
      return;
    }

    if (!this.data.contact.trim()) {
      wx.showToast({ title: '请输入用户唯一标识', icon: 'none' });
      return;
    }

    if (this.data.images.length === 0) {
      wx.showToast({ title: '请至少上传一张图片', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });

    const expireAt = this.calculateExpireAt();
    const expireDays = expireOptions[this.data.expireIndex].value;

    try {
      const res = await wx.cloud.callFunction({
        name: 'item',
        data: {
          action: 'update',
          itemId: this.data.itemId,
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
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(function() {
          const app = getApp();
          app.globalData.needRefreshHome = true;
          wx.navigateBack();
        }, 1500);
      } else {
        const errorMsg = (res.result && res.result.errMsg) || '保存失败';
        wx.showToast({ title: errorMsg, icon: 'none' });
      }
    } catch (err) {
      console.error('保存失败', err);
      wx.hideLoading();
      this.setData({ submitting: false });
      
      let errorMsg = '保存失败';
      if (err.errMsg && err.errMsg.indexOf('FunctionName') >= 0) {
        errorMsg = '云函数未部署';
      } else if (err.errMsg && err.errMsg.indexOf('env not exists') >= 0) {
        errorMsg = '云开发环境未配置';
      }
      
      wx.showToast({ title: errorMsg, icon: 'none' });
    }
  }
});
