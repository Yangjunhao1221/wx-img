//index.js
Page({
  data: {
    features: [
      {
        id: 'collage',
        title: '布局拼图',
        subtitle: '多种布局，自由拼接',
        icon: '🧩',
        description: '支持多种网格布局，智能排版，可拖拽调整图片位置',
        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        url: '/pages/collage/collage'
      },
      {
        id: 'longimage',
        title: '长图拼接',
        subtitle: '纵向排列，完美长图',
        icon: '📐',
        description: '垂直拼接多张图片，制作精美长图海报',
        color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        url: '/pages/longimage/longimage'
      }
    ]
  },

  onLoad: function (options) {
    console.log('首页加载');
  },

  // 先选图后进入拼图
  chooseImagesForCollage () {
    const maxCount = 16;
    wx.chooseMedia({
      count: maxCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = (res.tempFiles || []).map(f => f.tempFilePath).filter(Boolean);
        if (!paths || paths.length === 0) {
          wx.showToast({ title: '未选择图片', icon: 'none' });
          return;
        }
        wx.navigateTo({
          url: '/pages/collage/collage',
          success: (navRes) => {
            if (navRes && navRes.eventChannel) {
              navRes.eventChannel.emit('selectedImages', { paths });
            }
          },
          fail: (err) => {
            console.error('跳转到布局拼图失败:', err);
            wx.showToast({ title: '跳转失败', icon: 'none' });
          }
        });
      },
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.includes('cancel')) {
          // 用户取消不提示错误
          return;
        }
        console.error('选择图片失败:', err);
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  // 跳转到布局拼图
  goToCollage () {
    console.log('点击布局拼图,准备跳转');
    wx.navigateTo({
      url: '/pages/collage/collage',
      success: function () {
        console.log('跳转到布局拼图成功');
      },
      fail: function (err) {
        console.error('跳转到布局拼图失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 跳转到长图拼接
  goToLongImage () {
    console.log('点击长图拼接,准备跳转');
    wx.navigateTo({
      url: '/pages/longimage/longimage',
      success: function () {
        console.log('跳转到长图拼接成功');
      },
      fail: function (err) {
        console.error('跳转到长图拼接失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 处理功能卡片点击
  onFeatureClick (e) {
    const featureId = e.currentTarget.dataset.id;
    console.log('点击功能卡片:', featureId);

    if (featureId === 'collage') {
      this.chooseImagesForCollage();
    } else if (featureId === 'longimage') {
      this.goToLongImage();
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    }
  }
});