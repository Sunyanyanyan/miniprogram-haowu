const tagOptions = ['家用电器', '电子数码', '家居用品', '宠物用品', '运动器材', '图书音像', '厨房用品', '服装鞋帽', '美妆个护', '票务卡券', '食品饮料', '珠宝配饰', '其他'];

Page({
  data: {
    itemId: '',
    images: [],
    title: '',
    desc: '',
    contact: '',
    tag: '',
    tagIndex: -1,
    tags: tagOptions,
    value: '',
    submitting: false,
    loading: true
  },

  onLoad(options) {
    this.setData({ itemId: options.id });
    this.loadItemDetail();
  },

  async loadItemDetail() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'item',
        data: {
          action: 'getDetail',
          itemId: this.data.itemId
        }
      });

      const item = res.result.data;
      const tagIndex = tagOptions.indexOf(item.tag);
      
      this.setData({
        images: item.images || [],
        title: item.title || '',
        desc: item.desc || '',
        contact: item.contact || '',
        tag: item.tag || '',
        tagIndex: tagIndex >= 0 ? tagIndex : -1,
        value: item.value ? String(item.value) : '',
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

  onTagChange(e) {
    const index = parseInt(e.detail.value);
    if (index >= 0 && index < tagOptions.length) {
      this.setData({
        tagIndex: index,
        tag: tagOptions[index]
      });
    }
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

    wx.chooseMedia({
      count: maxCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFiles = res.tempFiles;
        
        if (this.data.images.length + tempFiles.length > 3) {
          wx.showToast({
            title: '最多上传3张图片',
            icon: 'none',
            duration: 2000
          });
          return;
        }
        
        wx.showLoading({ title: '上传中...' });

        try {
          for (let i = 0; i < tempFiles.length; i++) {
            if (this.data.images.length >= 3) {
              break;
            }
            await this.uploadImage(tempFiles[i].tempFilePath);
          }
          wx.hideLoading();
          
          wx.showToast({
            title: '上传成功',
            icon: 'success',
            duration: 1500
          });
        } catch (err) {
          wx.hideLoading();
          console.error('上传失败', err);
          wx.showToast({
            title: err.message || '上传失败',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },

  async uploadImage(filePath) {
    const cloudPath = 'items/' + Date.now() + '-' + Math.random().toString(36).substr(2) + '.jpg';
    
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath
    });

    const currentImages = this.data.images;
    if (currentImages.length < 3) {
      currentImages.push(uploadRes.fileID);
      this.setData({
        images: currentImages
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

  cancel() {
    wx.navigateBack();
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
    wx.showLoading({ title: '保存中...' });

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
          value: valueResult.value
        }
      });

      wx.hideLoading();
      this.setData({ submitting: false });
      
      if (res.result && res.result.errCode === 0) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });

        setTimeout(function() {
          wx.navigateBack();
        }, 1500);
      } else {
        const errorMsg = (res.result && res.result.errMsg) || '保存失败';
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        });
      }
    } catch (err) {
      console.error('保存失败', err);
      wx.hideLoading();
      this.setData({ submitting: false });
      
      wx.showToast({
        title: '保存失败',
        icon: 'none',
        duration: 3000
      });
    }
  }
});
