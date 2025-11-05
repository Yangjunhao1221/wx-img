//pages/history/history.js
Page({
  data: {
    historyList: [],
    isEditing: false,
    selectedItems: [],
    isEmpty: true
  },

  onLoad: function (options) {
    this.loadHistory();
  },

  onShow: function () {
    this.loadHistory();
  },

  // 加载历史记录
  loadHistory () {
    try {
      const history = wx.getStorageSync('imageHistory') || [];
      this.setData({
        historyList: history.reverse(), // 最新的在前面
        isEmpty: history.length === 0,
        selectedItems: []
      });
    } catch (error) {
      console.error('加载历史记录失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 保存历史记录到本地存储
  saveHistory () {
    try {
      wx.setStorageSync('imageHistory', this.data.historyList.reverse());
      this.setData({
        historyList: this.data.historyList.reverse()
      });
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  },

  // 切换编辑模式
  toggleEditMode () {
    const isEditing = !this.data.isEditing;
    this.setData({
      isEditing: isEditing,
      selectedItems: isEditing ? [] : this.data.selectedItems
    });
  },

  // 选择/取消选择项目
  onItemSelect (e) {
    if (!this.data.isEditing) return;

    const index = e.currentTarget.dataset.index;
    let selectedItems = [...this.data.selectedItems];

    if (selectedItems.includes(index)) {
      selectedItems = selectedItems.filter(item => item !== index);
    } else {
      selectedItems.push(index);
    }

    this.setData({ selectedItems });
  },

  // 全选/取消全选
  toggleSelectAll () {
    const allSelected = this.data.selectedItems.length === this.data.historyList.length;

    this.setData({
      selectedItems: allSelected ? [] : this.data.historyList.map((_, index) => index)
    });
  },

  // 删除选中项目
  deleteSelected () {
    if (this.data.selectedItems.length === 0) {
      wx.showToast({
        title: '请选择要删除的项目',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${this.data.selectedItems.length} 个项目吗？`,
      success: (res) => {
        if (res.confirm) {
          const newHistoryList = this.data.historyList.filter(
            (_, index) => !this.data.selectedItems.includes(index)
          );

          this.setData({
            historyList: newHistoryList,
            selectedItems: [],
            isEmpty: newHistoryList.length === 0
          });

          // 保存到本地存储
          try {
            wx.setStorageSync('imageHistory', newHistoryList);
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          } catch (error) {
            console.error('保存失败:', error);
          }
        }
      }
    });
  },

  // 清空所有历史记录
  clearAllHistory () {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('imageHistory');
            this.setData({
              historyList: [],
              selectedItems: [],
              isEmpty: true,
              isEditing: false
            });

            wx.showToast({
              title: '清空成功',
              icon: 'success'
            });
          } catch (error) {
            console.error('清空失败:', error);
            wx.showToast({
              title: '清空失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 下载图片
  downloadImage (e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.historyList[index];

    if (!item || !item.imagePath) {
      wx.showToast({
        title: '图片不存在',
        icon: 'error'
      });
      return;
    }

    wx.showLoading({
      title: '保存中...'
    });

    wx.saveImageToPhotosAlbum({
      filePath: item.imagePath,
      success: () => {
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('保存图片失败:', error);

        if (error.errMsg.includes('auth')) {
          wx.showModal({
            title: '需要授权',
            content: '需要相册权限来保存图片',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'error'
          });
        }
      }
    });
  },

  // 批量下载选中的图片
  downloadSelected () {
    if (this.data.selectedItems.length === 0) {
      wx.showToast({
        title: '请选择要下载的项目',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: `下载中 0/${this.data.selectedItems.length}`
    });

    let downloadCount = 0;
    let successCount = 0;

    const downloadNext = () => {
      if (downloadCount >= this.data.selectedItems.length) {
        wx.hideLoading();
        wx.showToast({
          title: `成功下载 ${successCount} 张`,
          icon: successCount > 0 ? 'success' : 'error'
        });
        return;
      }

      const index = this.data.selectedItems[downloadCount];
      const item = this.data.historyList[index];
      downloadCount++;

      wx.showLoading({
        title: `下载中 ${downloadCount}/${this.data.selectedItems.length}`
      });

      if (item && item.imagePath) {
        wx.saveImageToPhotosAlbum({
          filePath: item.imagePath,
          success: () => {
            successCount++;
            downloadNext();
          },
          fail: () => {
            downloadNext();
          }
        });
      } else {
        downloadNext();
      }
    };

    downloadNext();
  },

  // 预览图片
  previewImage (e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.historyList[index];

    if (!item || !item.imagePath) {
      wx.showToast({
        title: '图片不存在',
        icon: 'error'
      });
      return;
    }

    wx.previewImage({
      current: item.imagePath,
      urls: [item.imagePath]
    });
  },

  // 跳转到布局拼图
  goToCollage () {
    wx.navigateTo({
      url: '/pages/collage/collage'
    });
  },

  // 跳转到长图拼接
  goToLongImage () {
    wx.navigateTo({
      url: '/pages/longimage/longimage'
    });
  },

  // 格式化时间
  formatTime (timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return Math.floor(diff / 60000) + '分钟前';
    } else if (diff < 86400000) { // 1天内
      return Math.floor(diff / 3600000) + '小时前';
    } else if (diff < 604800000) { // 1周内
      return Math.floor(diff / 86400000) + '天前';
    } else {
      return date.toLocaleDateString();
    }
  }
});
