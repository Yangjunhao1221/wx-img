// pages/longimage/longimage.js
Page({
  data: {
    selectedImages: [],
    direction: 'vertical', // vertical, horizontal
    spacing: 0,
    backgroundColor: '#FFFFFF',
    cornerRadius: 0,
    canvasWidth: 750,
    canvasHeight: 1000,
    maxImages: 20,

    // 导出设置
    exportQuality: 'high',
    exportFormats: [
      { label: '高清JPG', value: 'high' },
      { label: '标准JPG', value: 'standard' },
      { label: '无损PNG', value: 'png' }
    ],

    // 界面状态
    isLoading: false
  },

  onLoad: function (options) {
    // 页面加载时的初始化
    console.log('长图页面onLoad');
  },

  onReady: function () {
    // 页面渲染完成后初始化Canvas
    console.log('长图页面onReady,开始初始化Canvas');
    this.initCanvas();
  },

  onShow: function () {
    console.log('长图页面onShow');
  },

  // 初始化画布
  initCanvas () {
    const that = this;
    console.log('开始初始化长图Canvas, canvasWidth:', that.data.canvasWidth, 'canvasHeight:', that.data.canvasHeight);

    // 使用 wx.createSelectorQuery 获取 canvas 节点
    wx.createSelectorQuery()
      .select('#longCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        console.log('长图Canvas查询结果:', res);

        if (!res || !res[0]) {
          console.error('长图Canvas节点查询失败,res为空');
          return;
        }

        const canvasNode = res[0].node;
        if (!canvasNode) {
          console.error('长图Canvas节点不存在');
          return;
        }

        console.log('长图Canvas节点获取成功');

        // 获取设备像素比
        const dpr = wx.getWindowInfo().pixelRatio || 2;
        console.log('设备像素比:', dpr);

        // 设置canvas实际绘制尺寸(考虑设备像素比)
        canvasNode.width = that.data.canvasWidth * dpr;
        canvasNode.height = that.data.canvasHeight * dpr;

        // 获取绘图上下文
        const ctx = canvasNode.getContext('2d');

        // 缩放绘图上下文以匹配设备像素比
        ctx.scale(dpr, dpr);

        console.log('长图Canvas设置完成:', {
          canvasWidth: canvasNode.width,
          canvasHeight: canvasNode.height,
          displayWidth: that.data.canvasWidth,
          displayHeight: that.data.canvasHeight,
          dpr: dpr
        });

        // 保存canvas和ctx到data
        that.setData({
          canvas: canvasNode,
          ctx: ctx
        }, () => {
          console.log('长图Canvas数据已保存到data');

          // 绘制初始背景和测试图形
          ctx.fillStyle = that.data.backgroundColor;
          ctx.fillRect(0, 0, that.data.canvasWidth, that.data.canvasHeight);

          // 绘制一个测试矩形,确保Canvas可见
          ctx.fillStyle = '#007AFF';
          ctx.fillRect(20, 20, 100, 100);

          // 绘制测试文字
          ctx.fillStyle = '#000000';
          ctx.font = '20px sans-serif';
          ctx.fillText('长图Canvas已就绪', 20, 150);

          console.log('长图Canvas初始化完成,已绘制测试图形');
        });
      });
  },

  // 选择图片
  selectImages () {
    const that = this;

    wx.chooseMedia({
      count: that.data.maxImages,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.setData({ isLoading: true });

        wx.showLoading({
          title: '处理图片中...'
        });

        const tempFiles = res.tempFiles;
        const newImages = tempFiles.map(file => ({
          path: file.tempFilePath,
          width: 0,
          height: 0
        }));

        that.setData({
          selectedImages: newImages
        });

        that.loadImageInfo().then(() => {
          that.calculateCanvasSize();
          that.updateCanvas();
          wx.hideLoading();
          that.setData({ isLoading: false });
          wx.showToast({
            title: '图片处理完成',
            icon: 'success'
          });
        }).catch(() => {
          wx.hideLoading();
          that.setData({ isLoading: false });
          wx.showToast({
            title: '图片处理失败',
            icon: 'error'
          });
        });
      },
      fail: function (err) {
        wx.showToast({
          title: '选择图片失败',
          icon: 'error'
        });
      }
    });
  },

  // 加载图片信息
  loadImageInfo () {
    const promises = this.data.selectedImages.map((image, index) => {
      return new Promise((resolve) => {
        wx.getImageInfo({
          src: image.path,
          success: (res) => {
            const updatedImages = [...this.data.selectedImages];
            updatedImages[index].width = res.width;
            updatedImages[index].height = res.height;
            this.setData({
              selectedImages: updatedImages
            });
            resolve();
          },
          fail: () => {
            resolve();
          }
        });
      });
    });

    return Promise.all(promises);
  },

  // 计算画布尺寸
  calculateCanvasSize () {
    const { selectedImages, direction, spacing } = this.data;
    if (selectedImages.length === 0) return;

    let totalWidth = 0, totalHeight = 0;
    let maxWidth = 0, maxHeight = 0;

    selectedImages.forEach(image => {
      if (direction === 'vertical') {
        totalHeight += image.height;
        maxWidth = Math.max(maxWidth, image.width);
      } else {
        totalWidth += image.width;
        maxHeight = Math.max(maxHeight, image.height);
      }
    });

    if (direction === 'vertical') {
      totalHeight += spacing * (selectedImages.length - 1);
      this.setData({
        canvasWidth: Math.min(maxWidth, 750),
        canvasHeight: Math.min(totalHeight * (750 / maxWidth), 2000)
      });
    } else {
      totalWidth += spacing * (selectedImages.length - 1);
      this.setData({
        canvasWidth: Math.min(totalWidth * (750 / maxHeight), 2000),
        canvasHeight: Math.min(maxHeight, 750)
      });
    }
  },

  // 移除图片
  removeImage (e) {
    const index = e.currentTarget.dataset.index;
    const selectedImages = this.data.selectedImages;
    selectedImages.splice(index, 1);
    this.setData({
      selectedImages: selectedImages
    });

    if (selectedImages.length > 0) {
      this.calculateCanvasSize();
      this.updateCanvas();
    }
  },

  // 清除所有图片
  clearImages () {
    this.setData({
      selectedImages: []
    });
    this.updateCanvas();
  },

  // 改变拼接方向
  onDirectionChange (e) {
    this.setData({
      direction: e.detail.value
    });
    this.calculateCanvasSize();
    this.updateCanvas();
  },

  // 更新间距
  onSpacingChange (e) {
    this.setData({
      spacing: parseInt(e.detail.value)
    });
    this.calculateCanvasSize();
    this.updateCanvas();
  },

  // 更新圆角
  onCornerRadiusChange (e) {
    this.setData({
      cornerRadius: parseInt(e.detail.value)
    });
    this.updateCanvas();
  },

  // 更新背景颜色
  onBackgroundColorChange (e) {
    this.setData({
      backgroundColor: e.detail.value
    });
    this.updateCanvas();
  },

  // 调整图片顺序
  moveUp (e) {
    const index = e.currentTarget.dataset.index;
    if (index === 0) return;

    const selectedImages = [...this.data.selectedImages];
    [selectedImages[index - 1], selectedImages[index]] = [selectedImages[index], selectedImages[index - 1]];

    this.setData({
      selectedImages: selectedImages
    });
    this.updateCanvas();
  },

  moveDown (e) {
    const index = e.currentTarget.dataset.index;
    if (index === this.data.selectedImages.length - 1) return;

    const selectedImages = [...this.data.selectedImages];
    [selectedImages[index], selectedImages[index + 1]] = [selectedImages[index + 1], selectedImages[index]];

    this.setData({
      selectedImages: selectedImages
    });
    this.updateCanvas();
  },

  // 更新画布
  updateCanvas () {
    if (!this.data.ctx || this.data.selectedImages.length === 0) {
      return;
    }

    const { ctx, canvasWidth, canvasHeight, selectedImages, direction, spacing, cornerRadius, backgroundColor } = this.data;

    // 清空画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 设置背景
    ctx.fillStyle = backgroundColor;
    this.roundRect(ctx, 0, 0, canvasWidth, canvasHeight, cornerRadius);
    ctx.fill();

    // 计算图片位置并绘制
    let currentX = 0, currentY = 0;

    selectedImages.forEach((image, index) => {
      if (direction === 'vertical') {
        // 垂直拼接
        const imageWidth = canvasWidth;
        const imageHeight = (image.height * canvasWidth) / image.width;

        this.loadAndDrawImage(image.path, currentX, currentY, imageWidth, imageHeight);
        currentY += imageHeight + spacing;
      } else {
        // 水平拼接
        const imageHeight = canvasHeight;
        const imageWidth = (image.width * canvasHeight) / image.height;

        this.loadAndDrawImage(image.path, currentX, currentY, imageWidth, imageHeight);
        currentX += imageWidth + spacing;
      }
    });
  },

  // 加载并绘制图片
  loadAndDrawImage (imagePath, x, y, width, height) {
    const that = this;
    const { ctx, cornerRadius, canvas } = this.data;

    // 创建图片对象
    const img = canvas.createImage();
    img.onload = () => {
      // 保存当前状态
      ctx.save();

      // 创建圆角裁剪路径
      that.roundRect(ctx, x, y, width, height, cornerRadius);
      ctx.clip();

      // 计算图片在容器中的显示尺寸和位置（保持宽高比，居中显示）
      const imgRatio = img.width / img.height;
      const containerRatio = width / height;

      let drawWidth, drawHeight, drawX, drawY;

      if (imgRatio > containerRatio) {
        // 图片比容器宽，以容器宽度为准
        drawWidth = width;
        drawHeight = width / imgRatio;
        drawX = x;
        drawY = y + (height - drawHeight) / 2;
      } else {
        // 图片比容器高，以容器高度为准
        drawHeight = height;
        drawWidth = height * imgRatio;
        drawX = x + (width - drawWidth) / 2;
        drawY = y;
      }

      // 绘制图片对象
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // 恢复状态
      ctx.restore();
    };

    img.onerror = () => {
      console.error('长图页面图片加载失败:', imagePath);
    };

    // 设置图片源
    img.src = imagePath;
  },

  // 绘制圆角矩形
  roundRect (ctx, x, y, width, height, radius) {
    if (radius === 0) {
      ctx.rect(x, y, width, height);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  },

  // 导出图片
  exportImage () {
    const that = this;

    if (that.data.selectedImages.length === 0) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '正在导出长图...'
    });

    // 先申请相册权限
    wx.authorize({
      scope: 'scope.writePhotosAlbum',
      success: () => {
        // 权限获取成功，继续导出
        that.performCanvasExport();
      },
      fail: () => {
        wx.hideLoading();
        wx.showModal({
          title: '需要授权',
          content: '保存图片到相册需要您的授权，请在设置中开启',
          showCancel: true,
          cancelText: '取消',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  if (settingRes.authSetting['scope.writePhotosAlbum']) {
                    that.performCanvasExport();
                  }
                }
              });
            }
          }
        });
      }
    });
  },

  // 执行Canvas导出 - 使用图片合成方式
  performCanvasExport () {
    const that = this;

    // 重新绘制Canvas确保内容完整
    that.updateCanvas();

    setTimeout(() => {
      // 使用Canvas 2D API导出
      if (that.data.canvas) {
        const ctx = that.data.canvas.getContext('2d');
        if (ctx) {
          // 确保Canvas有内容
          const imageData = ctx.getImageData(0, 0, that.data.canvasWidth, that.data.canvasHeight);
          if (imageData && imageData.data && imageData.data.length > 0) {
            wx.canvasToTempFilePath({
              canvas: that.data.canvas,
              success: function (res) {
                wx.hideLoading();
                console.log('长图Canvas导出成功:', res);
                // 保存到历史记录
                that.saveToHistory(res.tempFilePath);
                // 保存到相册
                that.saveToAlbum(res.tempFilePath);
              },
              fail: function (error) {
                console.error('长图Canvas 2D导出失败:', error);
                // 尝试使用图片合成方式
                that.exportWithImageComposition();
              }
            }, that);
          } else {
            console.error('长图Canvas内容为空');
            that.exportWithImageComposition();
          }
        } else {
          console.error('长图Canvas上下文获取失败');
          that.exportWithImageComposition();
        }
      } else {
        console.error('长图Canvas对象不存在');
        that.exportWithImageComposition();
      }
    }, 1000); // 增加延迟时间
  },

  // 使用图片合成方式导出
  exportWithImageComposition () {
    const that = this;

    wx.showToast({
      title: '使用图片合成方式导出',
      icon: 'loading',
      duration: 2000
    });

    // 创建临时Canvas进行图片合成
    const query = wx.createSelectorQuery();
    query.select('#longCanvas').fields({
      node: true,
      size: true
    }).exec((res) => {
      if (res[0]) {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // 设置Canvas尺寸
        const dpr = wx.getWindowInfo().pixelRatio;
        canvas.width = that.data.canvasWidth * dpr;
        canvas.height = that.data.canvasHeight * dpr;
        ctx.scale(dpr, dpr);

        // 绘制背景
        ctx.fillStyle = that.data.backgroundColor;
        ctx.fillRect(0, 0, that.data.canvasWidth, that.data.canvasHeight);

        // 绘制图片
        that.drawImagesToCanvas(ctx, canvas).then(() => {
          // 使用更简单的方式导出
          that.exportCanvasToFile(canvas);
        }).catch((error) => {
          wx.hideLoading();
          console.error('长图绘制失败:', error);
          wx.showToast({
            title: '导出失败，请重试',
            icon: 'error'
          });
        });
      } else {
        wx.hideLoading();
        wx.showToast({
          title: '导出失败，请重试',
          icon: 'error'
        });
      }
    });
  },

  // 导出Canvas到文件
  exportCanvasToFile (canvas) {
    const that = this;

    // 尝试多种导出方式
    const exportMethods = [
      // 方法1: 使用canvasToTempFilePath
      () => {
        return new Promise((resolve, reject) => {
          wx.canvasToTempFilePath({
            canvas: canvas,
            success: resolve,
            fail: reject
          }, that);
        });
      },
      // 方法2: 使用canvasId
      () => {
        return new Promise((resolve, reject) => {
          wx.canvasToTempFilePath({
            canvasId: 'longCanvas',
            success: resolve,
            fail: reject
          }, that);
        });
      },
      // 方法3: 使用简单的图片保存方式
      () => {
        return new Promise((resolve, reject) => {
          // 如果Canvas导出失败，尝试直接保存第一张图片作为示例
          if (that.data.selectedImages.length > 0) {
            const firstImage = that.data.selectedImages[0];
            const imagePath = typeof firstImage === 'string' ? firstImage : firstImage.path || firstImage.tempFilePath;

            // 直接保存第一张图片
            wx.saveImageToPhotosAlbum({
              filePath: imagePath,
              success: () => {
                wx.hideLoading();
                wx.showToast({
                  title: '已保存第一张图片到相册',
                  icon: 'success'
                });
                resolve({ tempFilePath: imagePath });
              },
              fail: (error) => {
                console.error('保存长图失败:', error);
                reject(error);
              }
            });
          } else {
            reject(new Error('没有可保存的长图'));
          }
        });
      }
    ];

    // 依次尝试各种导出方法
    let methodIndex = 0;
    const tryNextMethod = () => {
      if (methodIndex >= exportMethods.length) {
        wx.hideLoading();
        wx.showToast({
          title: '所有导出方式都失败了',
          icon: 'error'
        });
        return;
      }

      exportMethods[methodIndex]()
        .then((res) => {
          wx.hideLoading();
          console.log('长图Canvas导出成功:', res);
          // 保存到历史记录
          that.saveToHistory(res.tempFilePath);
          // 保存到相册
          that.saveToAlbum(res.tempFilePath);
        })
        .catch((error) => {
          console.error(`长图导出方式${methodIndex + 1}失败:`, error);
          methodIndex++;
          tryNextMethod();
        });
    };

    tryNextMethod();
  },

  // 绘制图片到Canvas
  drawImagesToCanvas (ctx, canvas) {
    const that = this;
    const images = that.data.selectedImages;

    return new Promise((resolve, reject) => {
      let loadedCount = 0;
      const totalImages = images.length;

      if (totalImages === 0) {
        resolve();
        return;
      }

      let currentY = 0;
      const spacing = that.data.spacing;

      // 使用Promise.all处理所有图片
      const imagePromises = images.map((image, index) => {
        return new Promise((resolveImg, rejectImg) => {
          // 使用wx.getImageInfo获取图片信息
          wx.getImageInfo({
            src: typeof image === 'string' ? image : image.path || image.tempFilePath,
            success: (res) => {
              // 创建图片对象
              const img = canvas.createImage();
              img.onload = () => {
                // 计算图片绘制尺寸，保持宽高比
                const maxWidth = that.data.canvasWidth - spacing * 2;
                const imgAspect = img.width / img.height;
                const drawWidth = Math.min(maxWidth, img.width);
                const drawHeight = drawWidth / imgAspect;
                const drawX = (that.data.canvasWidth - drawWidth) / 2;

                // 绘制圆角矩形背景
                if (that.data.cornerRadius > 0) {
                  // 绘制圆角矩形
                  const radius = that.data.cornerRadius;
                  ctx.beginPath();
                  ctx.moveTo(drawX + radius, currentY);
                  ctx.lineTo(drawX + drawWidth - radius, currentY);
                  ctx.quadraticCurveTo(drawX + drawWidth, currentY, drawX + drawWidth, currentY + radius);
                  ctx.lineTo(drawX + drawWidth, currentY + drawHeight - radius);
                  ctx.quadraticCurveTo(drawX + drawWidth, currentY + drawHeight, drawX + drawWidth - radius, currentY + drawHeight);
                  ctx.lineTo(drawX + radius, currentY + drawHeight);
                  ctx.quadraticCurveTo(drawX, currentY + drawHeight, drawX, currentY + drawHeight - radius);
                  ctx.lineTo(drawX, currentY + radius);
                  ctx.quadraticCurveTo(drawX, currentY, drawX + radius, currentY);
                  ctx.closePath();
                  ctx.fillStyle = '#FFFFFF';
                  ctx.fill();
                }

                // 绘制图片
                ctx.drawImage(img, drawX, currentY, drawWidth, drawHeight);

                // 更新下一个图片的位置
                currentY += drawHeight + spacing;

                resolveImg();
              };

              img.onerror = () => {
                console.error('长图图片加载失败:', image);
                resolveImg(); // 即使失败也继续
              };

              // 使用wx.getImageInfo返回的路径
              img.src = res.path;
            },
            fail: (error) => {
              console.error('获取长图图片信息失败:', error, image);
              resolveImg(); // 即使失败也继续
            }
          });
        });
      });

      // 等待所有图片加载完成
      Promise.all(imagePromises).then(() => {
        resolve();
      }).catch((error) => {
        console.error('长图图片绘制过程出错:', error);
        resolve(); // 即使出错也继续
      });
    });
  },

  // 保存到历史记录
  saveToHistory (imagePath) {
    try {
      const history = wx.getStorageSync('imageHistory') || [];
      const historyItem = {
        id: Date.now().toString(),
        type: 'longimage',
        title: `长图拼接 ${this.data.selectedImages.length}张`,
        imagePath: imagePath,
        imageCount: this.data.selectedImages.length,
        timestamp: Date.now(),
        settings: {
          direction: this.data.direction,
          spacing: this.data.spacing,
          cornerRadius: this.data.cornerRadius,
          backgroundColor: this.data.backgroundColor
        }
      };

      history.push(historyItem);

      // 只保留最近100条记录
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }

      wx.setStorageSync('imageHistory', history);
      console.log('已保存到历史记录');
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  },

  // 更新导出质量
  onExportQualityChange (e) {
    const quality = this.data.exportFormats[e.detail.value];
    this.setData({
      exportQuality: quality.value
    });
  },

  // 保存到相册
  saveToAlbum (filePath) {
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: function () {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      },
      fail: function (error) {
        console.error('保存到相册失败:', error);
        wx.showToast({
          title: '保存失败，请检查权限',
          icon: 'error'
        });
      }
    });
  }
});
