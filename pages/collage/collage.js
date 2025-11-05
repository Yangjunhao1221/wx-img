// pages/collage/collage.js
const { getLayoutTemplates } = require('../../utils/layoutTemplates.js');
const { calculateLayout, getRecommendedLayout, validateLayout } = require('../../utils/layoutCalculator.js');

Page({
  // Canvas对象存储为组件属性,不放在data中(真机上canvas/ctx是只读的,不能存入data)
  _canvas: null,
  _ctx: null,

  data: {
    // 新流程: 先选布局,再选图片
    workflowStep: 'selectLayout', // selectLayout, addImages, editing

    // 图片相关
    imageList: [],
    selectedImages: [],
    maxImages: 16,  // 升级到支持16张图片
    imageSlots: [],  // 图片槽位,每个槽位对应布局中的一个位置

    // 布局相关
    layoutType: 'grid',
    selectedLayout: null,  // 改为null,表示未选择
    currentLayoutTemplate: null,  // 当前选中的布局模板
    availableLayouts: [],
    allLayoutTemplates: [],  // 所有布局模板(1-16张图片)
    layoutGroups: [],  // 按图片数量分组的布局模板
    selectedImageCount: 0,  // 当前选择的图片数量分类(0表示显示全部)
    direction: 'horizontal', // horizontal, vertical

    // 画布设置
    canvasWidth: 750,
    canvasHeight: 750,
    aspectRatio: '1:1',
    aspectRatios: [
      { label: '1:1', value: '1:1', width: 1, height: 1 },
      { label: '16:9', value: '16:9', width: 16, height: 9 },
      { label: '9:16', value: '9:16', width: 9, height: 16 },
      { label: '16:10', value: '16:10', width: 16, height: 10 },
      { label: '4:3', value: '4:3', width: 4, height: 3 },
      { label: '3:4', value: '3:4', width: 3, height: 4 }
    ],
    customWidth: 1,
    customHeight: 1,

    // 样式设置
    borderWidth: 0,
    spacing: 10,
    cornerRadius: 8,
    backgroundColor: '#FFFFFF',
    backgroundImage: '',

    // 图片显示模式
    imageFitMode: 'cover', // 'cover' 填满槽位, 'contain' 完全显示

    // 水印设置
    enableWatermark: false,
    watermarkText: '',
    watermarkSize: 20,
    watermarkOpacity: 0.15,
    watermarkAngle: -30,
    watermarkDensity: 'medium',

    // 导出设置
    exportQuality: 'high',
    exportFormats: [
      { label: '高清JPG', value: 'high' },
      { label: '标准JPG', value: 'standard' },
      { label: '无损PNG', value: 'png' }
    ],

    // 编辑工具
    editMode: false,
    currentTool: '', // text, arrow, rect, circle
    editElements: [], // 绘制元素列表
    isDrawing: false,
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 0, y: 0 },

    // 文字工具
    textInput: '',
    textColor: '#FF0000',
    textSize: 24,

    // 绘图工具
    strokeColor: '#FF0000',
    strokeWidth: 3,
    fillColor: 'transparent',

    // 界面状态
    isLoading: false,

    // 拖拽相关
    isDragging: false,
    dragIndex: -1,
    dragStartPos: { x: 0, y: 0 },
    imagePositions: [], // 存储每个图片的位置和尺寸信息
    baseCanvasData: null, // 缓存基础画布数据

    // 图片操作相关
    selectedImageIndex: -1, // 当前选中的图片索引
  },

  onLoad: function () {
    console.log('布局拼图页面onLoad');
    // 初始化默认画布尺寸
    this.initDefaultCanvasSize();
    // 加载所有布局模板
    this.loadAllLayoutTemplates();
  },

  onReady: function () {
    // 页面渲染完成后初始化Canvas
    console.log('布局拼图页面onReady,开始初始化Canvas');
    this.initCanvas();
  },

  onShow: function () {
    console.log('布局拼图页面onShow');

    // 检查Canvas是否需要重新初始化(从组件属性检查)
    if (!this._ctx || !this._canvas) {
      console.log('onShow: Canvas未初始化,重新初始化');
      this.initCanvas();
    }
  },

  // 加载所有布局模板 - 按图片数量分组
  loadAllLayoutTemplates () {
    console.log('加载所有布局模板');
    const allTemplates = [];
    const groups = [];

    // 加载1-16张图片的所有布局模板
    for (let i = 1; i <= 16; i++) {
      const templates = getLayoutTemplates(i);
      if (templates && templates.length > 0) {
        const templatesWithCount = templates.map(template => ({
          ...template,
          imageCount: i  // 添加图片数量标识
        }));

        // 添加到总列表
        allTemplates.push(...templatesWithCount);

        // 添加到分组
        groups.push({
          imageCount: i,
          label: `${i}张`,
          templates: templatesWithCount,
          count: templatesWithCount.length
        });
      }
    }

    console.log(`加载了 ${allTemplates.length} 个布局模板, ${groups.length} 个分组`);

    this.setData({
      allLayoutTemplates: allTemplates,
      layoutGroups: groups
    });
  },

  // 初始化默认画布尺寸
  initDefaultCanvasSize () {
    try {
      const windowInfo = wx.getWindowInfo();
      const screenWidth = windowInfo.screenWidth || 375;

      // 预留边距
      const margin = 40;
      const maxCanvasWidth = screenWidth - margin;

      // 设置默认正方形画布
      const defaultSize = Math.min(maxCanvasWidth, 600);

      console.log('初始化画布尺寸:', defaultSize);

      this.setData({
        canvasWidth: defaultSize,
        canvasHeight: defaultSize
      });
    } catch (error) {
      console.error('初始化画布尺寸失败:', error);
      // 使用默认值
      this.setData({
        canvasWidth: 600,
        canvasHeight: 600
      });
    }
  },

  // 初始化画布
  initCanvas () {
    const that = this;
    console.log('开始初始化Canvas, canvasWidth:', that.data.canvasWidth, 'canvasHeight:', that.data.canvasHeight);

    // 使用 wx.createSelectorQuery 获取 canvas 节点
    wx.createSelectorQuery()
      .select('#canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        console.log('Canvas查询结果:', res);

        if (!res || !res[0]) {
          console.error('Canvas节点查询失败,res为空');
          return;
        }

        const canvasNode = res[0].node;
        if (!canvasNode) {
          console.error('Canvas节点不存在');
          return;
        }

        console.log('Canvas节点获取成功');

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

        console.log('Canvas设置完成:', {
          canvasWidth: canvasNode.width,
          canvasHeight: canvasNode.height,
          displayWidth: that.data.canvasWidth,
          displayHeight: that.data.canvasHeight,
          dpr: dpr
        });

        // 保存canvas和ctx到组件属性(不能存入data,真机上会报错)
        that._canvas = canvasNode;
        that._ctx = ctx;
        console.log('Canvas对象已保存到组件属性');

        // 绘制初始背景和测试图形
        ctx.fillStyle = that.data.backgroundColor;
        ctx.fillRect(0, 0, that.data.canvasWidth, that.data.canvasHeight);

        // 绘制一个测试矩形,确保Canvas可见
        ctx.fillStyle = '#007AFF';
        ctx.fillRect(20, 20, 100, 100);

        // 绘制测试文字
        ctx.fillStyle = '#000000';
        ctx.font = '20px sans-serif';
        ctx.fillText('Canvas已就绪', 20, 150);

        console.log('Canvas初始化完成,已绘制测试图形');
      });
  },

  // 选择图片
  // 一键上传图片 - 新流程
  selectImages () {
    const that = this;

    // 检查是否已选择布局
    if (!that.data.currentLayoutTemplate) {
      wx.showToast({
        title: '请先选择布局模板',
        icon: 'none'
      });
      return;
    }

    // 计算还能选择多少张图片
    const maxCount = that.data.currentLayoutTemplate.imageCount;
    const currentCount = that.data.selectedImages.length;
    const remainingCount = maxCount - currentCount;

    if (remainingCount <= 0) {
      wx.showToast({
        title: `当前布局最多${maxCount}张图片`,
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: remainingCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        wx.showLoading({
          title: '处理图片中...'
        });

        const tempFiles = res.tempFiles;
        const newImages = tempFiles.map(file => ({
          path: file.tempFilePath
        }));

        // 填充到空槽位
        const updatedSlots = [...that.data.imageSlots];
        const updatedImages = [...that.data.selectedImages];

        let addedCount = 0;
        for (let i = 0; i < updatedSlots.length && addedCount < newImages.length; i++) {
          if (updatedSlots[i].isEmpty) {
            updatedSlots[i].image = newImages[addedCount];
            updatedSlots[i].isEmpty = false;
            updatedImages.push(newImages[addedCount]);
            addedCount++;
          }
        }

        console.log('一键上传: 添加了', addedCount, '张图片');

        that.setData({
          imageSlots: updatedSlots,
          selectedImages: updatedImages,
          workflowStep: 'editing'
        }, () => {
          // setData完成后重新绘制Canvas
          console.log('一键上传: setData完成,开始重绘Canvas');
          setTimeout(() => {
            that.updateCanvas();
            wx.hideLoading();
          }, 100);
        });

        wx.showToast({
          title: `已添加${addedCount}张图片`,
          icon: 'success'
        });
      },
      fail: function () {
        wx.showToast({
          title: '选择图片失败',
          icon: 'error'
        });
      }
    });
  },

  // 获取可用布局 - 使用新的布局模板系统
  getAvailableLayouts (imageCount) {
    console.log('获取布局模板,图片数量:', imageCount);

    // 从布局模板文件获取
    const layouts = getLayoutTemplates(imageCount);

    if (layouts && layouts.length > 0) {
      console.log(`找到 ${layouts.length} 个布局模板`);
      return layouts;
    }

    // 如果没有找到,返回默认网格布局
    console.log('未找到布局模板,使用默认网格');
    const defaultRows = Math.ceil(Math.sqrt(imageCount));
    const defaultCols = Math.ceil(imageCount / defaultRows);

    return [{
      name: '自动网格',
      icon: '▦',
      type: 'grid',
      rows: defaultRows,
      cols: defaultCols
    }];
  },

  // 更新可用布局
  updateAvailableLayouts () {
    const imageCount = this.data.selectedImages.length;
    if (imageCount > 0) {
      const layouts = this.getAvailableLayouts(imageCount);
      this.setData({
        availableLayouts: layouts,
        selectedLayout: 0
      });
    } else {
      this.setData({
        availableLayouts: [],
        selectedLayout: 0
      });
    }
  },

  // 加载图片信息
  loadImagesInfo () {
    const that = this;
    const promises = this.data.selectedImages.map((image, index) => {
      return new Promise((resolve) => {
        wx.getImageInfo({
          src: image.path,
          success: (res) => {
            const updatedImages = [...that.data.selectedImages];
            updatedImages[index].width = res.width;
            updatedImages[index].height = res.height;
            that.setData({
              selectedImages: updatedImages
            });
            resolve();
          },
          fail: () => {
            resolve(); // 即使失败也继续
          }
        });
      });
    });

    return Promise.all(promises);
  },

  // 移除图片
  removeImage (e) {
    const index = e.currentTarget.dataset.index;
    const selectedImages = this.data.selectedImages;
    selectedImages.splice(index, 1);
    this.setData({
      selectedImages: selectedImages
    });
    this.updateAvailableLayouts();
    this.updateCanvas();
  },

  // 清除所有图片
  clearImages () {
    this.setData({
      selectedImages: [],
      availableLayouts: [],
      selectedLayout: 0
    });
    this.clearCanvas();
  },

  // 选择布局
  onLayoutChange (e) {
    this.setData({
      selectedLayout: parseInt(e.detail.value)
    });
    this.updateCanvas();
  },

  // 随机排列图片
  randomLayout () {
    const selectedImages = [...this.data.selectedImages];
    for (let i = selectedImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedImages[i], selectedImages[j]] = [selectedImages[j], selectedImages[i]];
    }
    this.setData({
      selectedImages: selectedImages
    });
    this.updateCanvas();
  },

  // 改变拼接方向
  onDirectionChange (e) {
    this.setData({
      direction: e.detail.value
    });
    this.updateCanvas();
  },

  // 改变宽高比
  onAspectRatioChange (e) {
    const ratio = this.data.aspectRatios[e.detail.value];
    this.setData({
      aspectRatio: ratio.value
    });
    this.calculateCanvasSize(ratio.width, ratio.height);
    this.updateCanvas();
  },

  // 计算画布尺寸
  calculateCanvasSize (width, height) {
    // 获取屏幕信息
    const windowInfo = wx.getWindowInfo();
    const screenWidth = windowInfo.screenWidth;

    // 预留边距，确保画布不超出屏幕
    const margin = 40; // 左右各20px边距
    const maxCanvasWidth = screenWidth - margin;

    // 根据宽高比计算画布尺寸
    const aspectRatio = width / height;
    let canvasWidth, canvasHeight;

    if (aspectRatio >= 1) {
      // 横向或正方形，以宽度为准
      canvasWidth = Math.min(maxCanvasWidth, 750); // 最大不超过750px
      canvasHeight = canvasWidth / aspectRatio;
    } else {
      // 纵向，以高度为准，但要确保宽度不超出屏幕
      canvasHeight = maxCanvasWidth / aspectRatio;
      canvasWidth = maxCanvasWidth;

      // 如果高度过大，重新按高度限制计算
      const maxCanvasHeight = windowInfo.screenHeight * 0.6; // 最大高度为屏幕高度的60%
      if (canvasHeight > maxCanvasHeight) {
        canvasHeight = maxCanvasHeight;
        canvasWidth = canvasHeight * aspectRatio;
      }
    }

    this.setData({
      canvasWidth: Math.floor(canvasWidth),
      canvasHeight: Math.floor(canvasHeight)
    });
  },

  // 更新间距
  onSpacingChange (e) {
    this.setData({
      spacing: parseInt(e.detail.value)
    });
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

  // 更新画布 - 新流程
  updateCanvas () {
    const ctx = this._ctx;
    const canvas = this._canvas;
    const { currentLayoutTemplate, imageSlots } = this.data;

    console.log('updateCanvas被调用');
    console.log('ctx存在:', !!ctx);
    console.log('canvas存在:', !!canvas);
    console.log('currentLayoutTemplate存在:', !!currentLayoutTemplate);
    console.log('imageSlots:', imageSlots);

    if (!currentLayoutTemplate) {
      console.log('布局未初始化');
      return;
    }

    // 如果canvas也不存在,说明需要重新初始化
    if (!ctx || !canvas) {
      console.error('Canvas未初始化,无法绘制');
      wx.showToast({
        title: 'Canvas未初始化,请重新进入页面',
        icon: 'none'
      });
      return;
    }

    // 检查是否有图片
    const hasImages = imageSlots && imageSlots.some(slot => !slot.isEmpty);
    console.log('hasImages:', hasImages);

    if (!hasImages) {
      // 没有图片,绘制占位框
      console.log('没有图片,绘制占位框');
      this.drawPlaceholders();
      return;
    }

    const { canvasWidth, canvasHeight, spacing, cornerRadius, backgroundColor } = this.data;

    // 清空画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 设置背景
    ctx.fillStyle = backgroundColor;
    this.roundRect(ctx, 0, 0, canvasWidth, canvasHeight, cornerRadius);
    ctx.fill();

    console.log('绘制图片, 布局:', currentLayoutTemplate.name);

    // 使用新的布局计算系统
    const imagePositions = calculateLayout(
      currentLayoutTemplate,
      canvasWidth,
      canvasHeight,
      spacing,
      currentLayoutTemplate.imageCount
    );

    // 更新图片位置信息
    this.setData({
      imagePositions: imagePositions
    });

    // 绘制每个槽位
    const drawPromises = imageSlots.map((slot, index) => {
      if (index >= imagePositions.length) {
        return Promise.resolve();
      }

      const pos = imagePositions[index];

      if (slot.isEmpty) {
        // 绘制占位框
        return new Promise((resolve) => {
          // 绘制边框
          ctx.strokeStyle = '#CCCCCC';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
          ctx.setLineDash([]);

          // 绘制背景
          ctx.fillStyle = '#F5F5F5';
          ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

          // 绘制+号
          const centerX = pos.x + pos.width / 2;
          const centerY = pos.y + pos.height / 2;
          const plusSize = Math.min(pos.width, pos.height) * 0.15;

          ctx.strokeStyle = '#999999';
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.moveTo(centerX - plusSize, centerY);
          ctx.lineTo(centerX + plusSize, centerY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(centerX, centerY - plusSize);
          ctx.lineTo(centerX, centerY + plusSize);
          ctx.stroke();

          resolve();
        });
      } else {
        // 绘制图片
        console.log(`绘制槽位${index}的图片:`, slot.image.path);
        return this.loadAndDrawImage(slot.image.path, pos.x, pos.y, pos.width, pos.height);
      }
    });

    // 等待所有图片绘制完成
    Promise.all(drawPromises).then(() => {
      console.log('所有图片绘制完成');

      // 添加水印
      if (this.data.enableWatermark && this.data.watermarkText) {
        this.addWatermark();
      }
      // 绘制编辑元素
      this.drawEditElements();

      // 强制刷新Canvas显示 - 使用requestAnimationFrame
      if (canvas) {
        // 触发Canvas重绘
        canvas.requestAnimationFrame(() => {
          console.log('Canvas重绘完成');
        });
      }

      // 拖拽优化：绘制完成后不需要额外缓存
    }).catch(err => {
      console.error('绘制图片失败:', err);
    });
  },

  // 重绘整个画布
  redrawCanvas () {
    this.updateCanvas();
  },

  // 绘制占位框 - 新流程
  drawPlaceholders () {
    const ctx = this._ctx;
    const canvas = this._canvas;
    const { canvasWidth, canvasHeight, spacing, currentLayoutTemplate } = this.data;

    console.log('drawPlaceholders被调用');
    console.log('ctx存在:', !!ctx);
    console.log('canvas存在:', !!canvas);
    console.log('currentLayoutTemplate存在:', !!currentLayoutTemplate);

    if (!ctx || !currentLayoutTemplate) {
      console.error('Canvas或布局模板未初始化,无法绘制占位框');
      return;
    }

    console.log('绘制占位框, 布局:', currentLayoutTemplate.name);

    // 清空画布
    ctx.fillStyle = this.data.backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 计算布局位置
    const positions = calculateLayout(
      currentLayoutTemplate,
      canvasWidth,
      canvasHeight,
      spacing,
      currentLayoutTemplate.imageCount
    );

    // 保存位置信息
    this.setData({
      imagePositions: positions
    });

    // 绘制每个占位框
    positions.forEach((pos, index) => {
      // 绘制边框
      ctx.strokeStyle = '#CCCCCC';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);  // 虚线
      ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
      ctx.setLineDash([]);  // 恢复实线

      // 绘制背景
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

      // 绘制+号
      const centerX = pos.x + pos.width / 2;
      const centerY = pos.y + pos.height / 2;
      const plusSize = Math.min(pos.width, pos.height) * 0.2;

      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 3;

      // 横线
      ctx.beginPath();
      ctx.moveTo(centerX - plusSize, centerY);
      ctx.lineTo(centerX + plusSize, centerY);
      ctx.stroke();

      // 竖线
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - plusSize);
      ctx.lineTo(centerX, centerY + plusSize);
      ctx.stroke();

      // 绘制索引号
      ctx.fillStyle = '#999999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${index + 1}`, centerX, centerY + plusSize + 10);
    });

    console.log('占位框绘制完成');

    // 强制刷新Canvas显示
    if (canvas) {
      canvas.requestAnimationFrame(() => {
        console.log('占位框Canvas刷新完成');
      });
    }
  },


  // 绘制编辑元素
  drawEditElements () {
    const ctx = this._ctx;
    if (!ctx || this.data.editElements.length === 0) {
      return;
    }

    this.data.editElements.forEach(element => {
      switch (element.type) {
        case 'text':
          this.drawTextElement(ctx, element);
          break;
        case 'arrow':
          this.drawArrowElement(ctx, element);
          break;
        case 'rect':
          this.drawRectElement(ctx, element);
          break;
        case 'circle':
          this.drawCircleElement(ctx, element);
          break;
      }
    });
  },

  // 绘制文字元素
  drawTextElement (ctx, element) {
    ctx.save();
    ctx.font = `${element.size}px sans-serif`;
    ctx.fillStyle = element.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(element.text, element.x, element.y);
    ctx.restore();
  },

  // 绘制箭头元素
  drawArrowElement (ctx, element) {
    ctx.save();
    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.color;
    ctx.lineWidth = element.width;

    // 绘制箭头线
    ctx.beginPath();
    ctx.moveTo(element.startX, element.startY);
    ctx.lineTo(element.endX, element.endY);
    ctx.stroke();

    // 计算箭头头部
    const angle = Math.atan2(element.endY - element.startY, element.endX - element.startX);
    const headlen = 15;

    // 绘制箭头头部
    ctx.beginPath();
    ctx.moveTo(element.endX, element.endY);
    ctx.lineTo(
      element.endX - headlen * Math.cos(angle - Math.PI / 6),
      element.endY - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      element.endX - headlen * Math.cos(angle + Math.PI / 6),
      element.endY - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },

  // 绘制矩形元素
  drawRectElement (ctx, element) {
    ctx.save();
    ctx.lineWidth = element.strokeWidth;
    ctx.strokeStyle = element.strokeColor;

    ctx.beginPath();
    ctx.rect(element.x, element.y, element.width, element.height);

    if (element.fillColor && element.fillColor !== 'transparent') {
      ctx.fillStyle = element.fillColor;
      ctx.fill();
    }

    ctx.stroke();
    ctx.restore();
  },

  // 绘制圆圈元素
  drawCircleElement (ctx, element) {
    ctx.save();
    ctx.lineWidth = element.strokeWidth;
    ctx.strokeStyle = element.strokeColor;

    ctx.beginPath();
    ctx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI);

    if (element.fillColor && element.fillColor !== 'transparent') {
      ctx.fillStyle = element.fillColor;
      ctx.fill();
    }

    ctx.stroke();
    ctx.restore();
  },

  // 清空画布
  clearCanvas () {
    const ctx = this._ctx;
    if (ctx) {
      const { canvasWidth, canvasHeight, backgroundColor } = this.data;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  },

  // 添加水印
  addWatermark () {
    const ctx = this._ctx;
    if (!ctx || !this.data.enableWatermark || !this.data.watermarkText) {
      return;
    }

    const { canvasWidth, canvasHeight, watermarkText, watermarkSize, watermarkOpacity, watermarkAngle, watermarkDensity } = this.data;

    const spacing = watermarkDensity === 'dense' ? 100 : watermarkDensity === 'medium' ? 150 : 200;

    ctx.save();
    ctx.globalAlpha = watermarkOpacity;
    ctx.font = `${watermarkSize}px sans-serif`;
    ctx.fillStyle = 'rgba(128, 128, 128, 0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let x = 0; x < canvasWidth + spacing; x += spacing) {
      for (let y = 0; y < canvasHeight + spacing; y += spacing) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(watermarkAngle * Math.PI / 180);
        ctx.fillText(watermarkText, 0, 0);
        ctx.restore();
      }
    }

    ctx.restore();
  },

  // 加载并绘制图片
  loadAndDrawImage (imagePath, x, y, width, height) {
    const that = this;
    const ctx = this._ctx;
    const canvas = this._canvas;
    const { cornerRadius } = this.data;

    console.log('开始加载图片:', imagePath);

    return new Promise((resolve) => {
      if (!canvas) {
        console.error('Canvas对象不存在,无法加载图片');
        resolve();
        return;
      }

      // 创建图片对象
      const img = canvas.createImage();

      img.onload = () => {
        try {
          console.log('图片加载成功,开始绘制:', imagePath);

          // 保存当前状态
          ctx.save();

          // 创建圆角裁剪路径
          that.roundRect(ctx, x, y, width, height, cornerRadius);
          ctx.clip();

          // 计算图片在容器中的显示尺寸和位置
          const imgRatio = img.width / img.height;
          const containerRatio = width / height;
          const fitMode = that.data.imageFitMode; // 'cover' 或 'contain'

          let drawWidth, drawHeight, drawX, drawY;

          if (fitMode === 'cover') {
            // cover模式: 填满容器,可能裁剪图片
            if (imgRatio > containerRatio) {
              // 图片比容器宽,以容器高度为准
              drawHeight = height;
              drawWidth = height * imgRatio;
              drawX = x + (width - drawWidth) / 2;
              drawY = y;
            } else {
              // 图片比容器窄,以容器宽度为准
              drawWidth = width;
              drawHeight = width / imgRatio;
              drawX = x;
              drawY = y + (height - drawHeight) / 2;
            }
          } else {
            // contain模式: 完全显示图片,可能有留白
            if (imgRatio > containerRatio) {
              // 图片比容器宽,以容器宽度为准
              drawWidth = width;
              drawHeight = width / imgRatio;
              drawX = x;
              drawY = y + (height - drawHeight) / 2;
            } else {
              // 图片比容器窄,以容器高度为准
              drawHeight = height;
              drawWidth = height * imgRatio;
              drawX = x + (width - drawWidth) / 2;
              drawY = y;
            }
          }

          // 绘制图片对象
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

          // 恢复状态
          ctx.restore();

          console.log('图片绘制完成, 模式:', fitMode);
          resolve();
        } catch (error) {
          console.error('绘制图片失败:', error);
          resolve();
        }
      };

      img.onerror = (err) => {
        console.error('图片加载失败:', imagePath, err);
        resolve();
      };

      // 设置图片源
      img.src = imagePath;
    });
  },

  // 绘制圆角矩形
  roundRect (ctx, x, y, width, height, radius) {
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
      title: '正在导出图片...'
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
      const canvas = that._canvas;
      const ctx = that._ctx;

      if (canvas && ctx) {
        // 确保Canvas有内容
        const imageData = ctx.getImageData(0, 0, that.data.canvasWidth, that.data.canvasHeight);
        if (imageData && imageData.data && imageData.data.length > 0) {
          wx.canvasToTempFilePath({
            canvas: canvas,
            success: function (res) {
              wx.hideLoading();
              console.log('Canvas导出成功:', res);
              // 保存到历史记录
              that.saveToHistory(res.tempFilePath);
              // 保存到相册
              that.saveToAlbum(res.tempFilePath);
            },
            fail: function (error) {
              console.error('Canvas 2D导出失败:', error);
              // 尝试使用图片合成方式
              that.exportWithImageComposition();
            }
          }, that);
        } else {
          console.error('Canvas内容为空');
          that.exportWithImageComposition();
        }
      } else {
        console.error('Canvas对象不存在');
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
    query.select('#canvas').fields({
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
          console.error('图片绘制失败:', error);
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
            canvasId: 'canvas',
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
                console.error('保存图片失败:', error);
                reject(error);
              }
            });
          } else {
            reject(new Error('没有可保存的图片'));
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
          console.log('Canvas导出成功:', res);
          // 保存到历史记录
          that.saveToHistory(res.tempFilePath);
          // 保存到相册
          that.saveToAlbum(res.tempFilePath);
        })
        .catch((error) => {
          console.error(`导出方式${methodIndex + 1}失败:`, error);
          methodIndex++;
          tryNextMethod();
        });
    };

    tryNextMethod();
  },

  // 绘制图片到Canvas (用于导出)
  drawImagesToCanvas (ctx, canvas) {
    const that = this;
    const { currentLayoutTemplate, imageSlots } = that.data;

    return new Promise((resolve, reject) => {
      if (!currentLayoutTemplate) {
        reject(new Error('未找到布局配置'));
        return;
      }

      // 检查是否有图片
      const hasImages = imageSlots && imageSlots.some(slot => !slot.isEmpty);
      if (!hasImages) {
        console.log('导出: 没有图片');
        resolve();
        return;
      }

      console.log('导出: 使用布局', currentLayoutTemplate.name);

      // 使用新的布局计算系统
      const imagePositions = calculateLayout(
        currentLayoutTemplate,
        that.data.canvasWidth,
        that.data.canvasHeight,
        that.data.spacing,
        currentLayoutTemplate.imageCount
      );

      // 使用Promise.all处理所有槽位
      const imagePromises = imageSlots.map((slot, index) => {
        return new Promise((resolveImg) => {
          // 跳过空槽位
          if (slot.isEmpty || !slot.image) {
            resolveImg();
            return;
          }

          if (index >= imagePositions.length) {
            console.warn(`导出: 图片 ${index} 超出布局范围`);
            resolveImg();
            return;
          }

          const pos = imagePositions[index];
          const image = slot.image;

          // 使用wx.getImageInfo获取图片信息
          wx.getImageInfo({
            src: typeof image === 'string' ? image : image.path || image.tempFilePath,
            success: (res) => {
              // 创建图片对象
              const img = canvas.createImage();
              img.onload = () => {
                // 计算图片绘制尺寸，保持宽高比
                const imgAspect = img.width / img.height;
                const cellAspect = pos.width / pos.height;

                let drawWidth, drawHeight, drawX, drawY;

                if (imgAspect > cellAspect) {
                  // 图片更宽，以宽度为准
                  drawWidth = pos.width;
                  drawHeight = drawWidth / imgAspect;
                } else {
                  // 图片更高，以高度为准
                  drawHeight = pos.height;
                  drawWidth = drawHeight * imgAspect;
                }

                // 居中绘制
                drawX = pos.x + (pos.width - drawWidth) / 2;
                drawY = pos.y + (pos.height - drawHeight) / 2;

                // 绘制圆角矩形背景
                if (that.data.cornerRadius > 0) {
                  const radius = that.data.cornerRadius;
                  ctx.save();
                  ctx.beginPath();
                  that.roundRect(ctx, pos.x, pos.y, pos.width, pos.height, radius);
                  ctx.clip();
                }

                // 绘制图片
                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

                if (that.data.cornerRadius > 0) {
                  ctx.restore();
                }

                resolveImg();
              };

              img.onerror = () => {
                console.error('导出: 图片加载失败:', image);
                resolveImg(); // 即使失败也继续
              };

              // 使用wx.getImageInfo返回的路径
              img.src = res.path;
            },
            fail: (error) => {
              console.error('导出: 获取图片信息失败:', error, image);
              resolveImg(); // 即使失败也继续
            }
          });
        });
      });

      // 等待所有图片加载完成
      Promise.all(imagePromises).then(() => {
        resolve();
      }).catch((error) => {
        console.error('图片绘制过程出错:', error);
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
        type: 'collage',
        title: `布局拼图 ${this.data.selectedImages.length}张`,
        imagePath: imagePath,
        imageCount: this.data.selectedImages.length,
        timestamp: Date.now(),
        settings: {
          layout: this.data.selectedLayout,
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

  // 切换水印功能
  onWatermarkToggle (e) {
    this.setData({
      enableWatermark: e.detail.value
    });
    this.updateCanvas();
  },

  // 更新水印文字
  onWatermarkTextChange (e) {
    this.setData({
      watermarkText: e.detail.value
    });
    if (this.data.enableWatermark) {
      this.updateCanvas();
    }
  },

  // 更新水印字号
  onWatermarkSizeChange (e) {
    this.setData({
      watermarkSize: parseInt(e.detail.value)
    });
    if (this.data.enableWatermark) {
      this.updateCanvas();
    }
  },

  // 更新水印透明度
  onWatermarkOpacityChange (e) {
    this.setData({
      watermarkOpacity: parseFloat(e.detail.value) / 100
    });
    if (this.data.enableWatermark) {
      this.updateCanvas();
    }
  },

  // 更新水印密度
  onWatermarkDensityChange (e) {
    const densities = ['sparse', 'medium', 'dense'];
    this.setData({
      watermarkDensity: densities[e.detail.value]
    });
    if (this.data.enableWatermark) {
      this.updateCanvas();
    }
  },

  // 更新导出质量
  onExportQualityChange (e) {
    const quality = this.data.exportFormats[e.detail.value];
    this.setData({
      exportQuality: quality.value
    });
  },

  // 切换编辑模式
  toggleEditMode () {
    this.setData({
      editMode: !this.data.editMode,
      currentTool: ''
    });
  },

  // 选择编辑工具
  selectTool (e) {
    const tool = e.currentTarget.dataset.tool;
    this.setData({
      currentTool: this.data.currentTool === tool ? '' : tool,
      editMode: true
    });

    if (tool === 'text') {
      this.showTextInput();
    }
  },

  // 显示文字输入框
  showTextInput () {
    const that = this;
    wx.showModal({
      title: '添加文字',
      placeholderText: '请输入文字内容',
      editable: true,
      success: function (res) {
        if (res.confirm && res.content) {
          that.setData({
            textInput: res.content
          });
          wx.showToast({
            title: '点击画布添加文字',
            icon: 'none'
          });
        }
      }
    });
  },

  // 画布触摸开始
  onCanvasTouchStart (e) {
    const x = e.touches[0].x;
    const y = e.touches[0].y;

    // 新流程: 检查是否点击了占位框
    if (this.data.workflowStep === 'addImages' || this.data.workflowStep === 'editing') {
      const slotIndex = this.getHitSlotIndex(x, y);
      if (slotIndex !== -1) {
        console.log('点击了槽位:', slotIndex);
        // 触发槽位点击事件
        this.onSlotTap({ currentTarget: { dataset: { index: slotIndex } } });
        return;
      }
    }

    // 编辑工具模式
    if (this.data.editMode && this.data.currentTool) {
      this.setData({
        isDrawing: true,
        startPoint: { x, y }
      });

      if (this.data.currentTool === 'text' && this.data.textInput) {
        this.addTextElement(x, y);
      }
      return;
    }

    // 拖拽模式 - 检查是否点击了图片
    const hitIndex = this.getHitImageIndex(x, y);
    if (hitIndex !== -1) {
      this.setData({
        isDragging: true,
        dragIndex: hitIndex,
        dragStartPos: { x, y }
      });

      // 视觉反馈：高亮选中的图片
      this.highlightImage(hitIndex);
    }
  },

  // 画布触摸移动
  onCanvasTouchMove (e) {
    const x = e.touches[0].x;
    const y = e.touches[0].y;

    // 编辑工具模式
    if (this.data.isDrawing && this.data.editMode) {
      this.setData({
        endPoint: { x, y }
      });
      return;
    }

    // 拖拽模式
    if (this.data.isDragging && this.data.dragIndex !== -1) {
      const deltaX = x - this.data.dragStartPos.x;
      const deltaY = y - this.data.dragStartPos.y;

      // 计算拖拽距离
      const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const draggedImagePos = this.data.imagePositions[this.data.dragIndex];
      const threshold = draggedImagePos ? draggedImagePos.width / 2 : 50;

      // 检查当前位置是否有可交换的目标
      const targetIndex = this.getHitImageIndex(x, y);

      // 只有在拖拽距离超过阈值且有有效目标时才显示交换预览
      if (dragDistance > threshold && targetIndex !== -1 && targetIndex !== this.data.dragIndex) {
        // 避免重复显示相同的交换预览
        if (this.lastSwapPreview !== `${this.data.dragIndex}-${targetIndex}`) {
          this.showSwapPreview(this.data.dragIndex, targetIndex);
          this.lastSwapPreview = `${this.data.dragIndex}-${targetIndex}`;
        }
      } else {
        // 显示正常的拖拽效果
        this.redrawCanvasWithDrag(x, y);
        this.lastSwapPreview = null;
      }
    }
  },

  // 画布触摸结束
  onCanvasTouchEnd (e) {
    // 编辑工具模式
    if (this.data.isDrawing && this.data.editMode) {
      const { currentTool, startPoint, endPoint } = this.data;

      if (currentTool === 'arrow') {
        this.addArrowElement(startPoint, endPoint);
      } else if (currentTool === 'rect') {
        this.addRectElement(startPoint, endPoint);
      } else if (currentTool === 'circle') {
        this.addCircleElement(startPoint, endPoint);
      }

      this.setData({
        isDrawing: false
      });
      return;
    }

    // 拖拽模式结束
    if (this.data.isDragging) {
      const x = e.changedTouches[0].x;
      const y = e.changedTouches[0].y;

      // 计算拖拽距离
      const dragDistance = Math.sqrt(
        Math.pow(x - this.data.dragStartPos.x, 2) +
        Math.pow(y - this.data.dragStartPos.y, 2)
      );

      // 获取被拖拽图片的尺寸信息
      const draggedImagePos = this.data.imagePositions[this.data.dragIndex];
      const threshold = draggedImagePos ? draggedImagePos.width / 2 : 50; // 移动距离阈值

      // 只有当拖拽距离超过阈值时才进行位置交换
      if (dragDistance > threshold) {
        // 检查是否可以放置到新位置（交换位置）
        const targetIndex = this.getHitImageIndex(x, y);
        if (targetIndex !== -1 && targetIndex !== this.data.dragIndex) {
          this.swapImages(this.data.dragIndex, targetIndex);
          wx.showToast({
            title: '位置已交换',
            icon: 'success',
            duration: 1000
          });
        } else {
          wx.showToast({
            title: '未找到交换目标',
            icon: 'none',
            duration: 1000
          });
        }
      }

      // 清理拖拽相关的状态
      if (this.dragTimer) {
        clearTimeout(this.dragTimer);
        this.dragTimer = null;
      }
      this.lastSwapPreview = null;

      this.setData({
        isDragging: false,
        dragIndex: -1
      });

      // 重新绘制最终布局
      this.updateCanvas();
    }
  },

  // 添加文字元素
  addTextElement (x, y) {
    const element = {
      type: 'text',
      x: x,
      y: y,
      text: this.data.textInput,
      color: this.data.textColor,
      size: this.data.textSize
    };

    this.setData({
      editElements: [...this.data.editElements, element]
    });

    this.redrawCanvas();
  },

  // 添加箭头元素
  addArrowElement (startPoint, endPoint) {
    const element = {
      type: 'arrow',
      startX: startPoint.x,
      startY: startPoint.y,
      endX: endPoint.x,
      endY: endPoint.y,
      color: this.data.strokeColor,
      width: this.data.strokeWidth
    };

    this.setData({
      editElements: [...this.data.editElements, element]
    });

    this.redrawCanvas();
  },

  // 添加矩形元素
  addRectElement (startPoint, endPoint) {
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);

    const element = {
      type: 'rect',
      x: x,
      y: y,
      width: width,
      height: height,
      strokeColor: this.data.strokeColor,
      strokeWidth: this.data.strokeWidth,
      fillColor: this.data.fillColor
    };

    this.setData({
      editElements: [...this.data.editElements, element]
    });

    this.redrawCanvas();
  },

  // 添加圆圈元素
  addCircleElement (startPoint, endPoint) {
    const radius = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) +
      Math.pow(endPoint.y - startPoint.y, 2)
    ) / 2;

    const element = {
      type: 'circle',
      x: startPoint.x,
      y: startPoint.y,
      radius: radius,
      strokeColor: this.data.strokeColor,
      strokeWidth: this.data.strokeWidth,
      fillColor: this.data.fillColor
    };

    this.setData({
      editElements: [...this.data.editElements, element]
    });

    this.redrawCanvas();
  },

  // 清除编辑元素
  clearEditElements () {
    this.setData({
      editElements: []
    });
    this.updateCanvas();
  },

  // 检测点击位置是否在某个图片上
  getHitImageIndex (x, y) {
    for (let i = 0; i < this.data.imagePositions.length; i++) {
      const pos = this.data.imagePositions[i];
      if (x >= pos.x && x <= pos.x + pos.width &&
        y >= pos.y && y <= pos.y + pos.height) {
        return i;
      }
    }
    return -1;
  },

  // 交换两个图片的位置
  swapImages (index1, index2) {
    const selectedImages = [...this.data.selectedImages];
    [selectedImages[index1], selectedImages[index2]] = [selectedImages[index2], selectedImages[index1]];

    this.setData({
      selectedImages: selectedImages
    });
  },

  // 高亮显示选中的图片
  highlightImage (index) {
    const ctx = this._ctx;
    if (!ctx || !this.data.imagePositions[index]) return;

    const pos = this.data.imagePositions[index];

    // 绘制高亮边框
    ctx.save();
    ctx.strokeStyle = '#007AFF';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(pos.x - 2, pos.y - 2, pos.width + 4, pos.height + 4);
    ctx.restore();
  },

  // 更新拖拽图片的位置
  updateDraggedImagePosition (index, deltaX, deltaY) {
    // 这里可以实现实时位置更新的逻辑
    // 暂时只是记录偏移，实际绘制在redrawCanvasWithDrag中处理
  },

  // 带拖拽效果的重绘
  redrawCanvasWithDrag (currentX, currentY) {
    // 简化拖拽绘制，避免复杂的缓存操作
    const ctx = this._ctx;
    if (!ctx || this.data.dragIndex === -1) return;

    // 节流处理，避免过于频繁的重绘
    if (this.dragTimer) return;

    this.dragTimer = setTimeout(() => {
      // 先重绘整个画布以清除之前的拖拽痕迹
      this.updateCanvas();

      // 然后在新位置绘制拖拽预览框
      setTimeout(() => {
        const pos = this.data.imagePositions[this.data.dragIndex];

        if (pos && ctx) {
          ctx.save();
          ctx.strokeStyle = '#007AFF';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.globalAlpha = 0.8;

          // 绘制拖拽预览框
          const scale = 0.9;
          const scaledWidth = pos.width * scale;
          const scaledHeight = pos.height * scale;

          ctx.strokeRect(
            currentX - scaledWidth / 2,
            currentY - scaledHeight / 2,
            scaledWidth,
            scaledHeight
          );

          ctx.restore();
        }
      }, 10); // 短暂延迟，确保画布重绘完成

      this.dragTimer = null;
    }, 50); // 减少频率，避免过度重绘
  },


  // 显示交换预览
  showSwapPreview (dragIndex, targetIndex) {
    const ctx = this._ctx;
    if (!ctx || !this.data.imagePositions[dragIndex] || !this.data.imagePositions[targetIndex]) {
      return;
    }

    // 先重绘整个画布以清除之前的内容
    this.updateCanvas();

    // 然后显示交换预览边框
    setTimeout(() => {
      const pos1 = this.data.imagePositions[dragIndex];
      const pos2 = this.data.imagePositions[targetIndex];

      if (ctx && pos1 && pos2) {
        ctx.save();
        ctx.strokeStyle = '#FF3B30'; // 红色表示交换
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.globalAlpha = 0.9;

        ctx.strokeRect(pos1.x - 2, pos1.y - 2, pos1.width + 4, pos1.height + 4);
        ctx.strokeRect(pos2.x - 2, pos2.y - 2, pos2.width + 4, pos2.height + 4);

        ctx.restore();
      }
    }, 10); // 短暂延迟，确保画布重绘完成
  },


  // 绘制保持宽高比的图片
  drawImageWithAspectRatio (ctx, img, x, y, width, height) {
    const imgRatio = img.width / img.height;
    const containerRatio = width / height;

    let drawWidth, drawHeight, drawX, drawY;

    if (imgRatio > containerRatio) {
      drawWidth = width;
      drawHeight = width / imgRatio;
      drawX = x;
      drawY = y + (height - drawHeight) / 2;
    } else {
      drawHeight = height;
      drawWidth = height * imgRatio;
      drawX = x + (width - drawWidth) / 2;
      drawY = y;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
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
  },

  // 缩略图点击
  onThumbnailTap (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      selectedImageIndex: index
    });

    // 可以添加高亮选中图片的逻辑
    this.highlightImage(index);
  },

  // 缩略图长按
  onThumbnailLongpress (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    wx.showActionSheet({
      itemList: ['换一张', '旋转', '删除'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.replaceImage({ currentTarget: { dataset: { index } } });
            break;
          case 1:
            this.rotateImage({ currentTarget: { dataset: { index } } });
            break;
          case 2:
            this.deleteImage({ currentTarget: { dataset: { index } } });
            break;
        }
      }
    });
  },

  // 检测点击位置是否在某个槽位内
  getHitSlotIndex (x, y) {
    const { imagePositions, imageSlots } = this.data;

    if (!imagePositions || imagePositions.length === 0) {
      return -1;
    }

    for (let i = 0; i < imagePositions.length; i++) {
      const pos = imagePositions[i];
      if (x >= pos.x && x <= pos.x + pos.width &&
        y >= pos.y && y <= pos.y + pos.height) {
        return i;
      }
    }

    return -1;
  },

  // 点击槽位添加图片
  onSlotTap (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const slot = this.data.imageSlots[index];

    if (!slot.isEmpty) {
      // 已有图片,可以替换
      wx.showModal({
        title: '提示',
        content: '是否替换这张图片?',
        success: (res) => {
          if (res.confirm) {
            this.selectImageForSlot(index);
          }
        }
      });
    } else {
      // 空槽位,直接添加
      this.selectImageForSlot(index);
    }
  },

  // 为指定槽位选择图片
  selectImageForSlot (slotIndex) {
    const that = this;

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const tempFile = res.tempFiles[0];
        const newImage = {
          path: tempFile.tempFilePath
        };

        // 更新槽位
        const updatedSlots = [...that.data.imageSlots];
        const updatedImages = [...that.data.selectedImages];

        // 如果槽位已有图片,替换
        if (!updatedSlots[slotIndex].isEmpty) {
          const oldImageIndex = updatedImages.findIndex(img =>
            img.path === updatedSlots[slotIndex].image.path
          );
          if (oldImageIndex !== -1) {
            updatedImages[oldImageIndex] = newImage;
          }
        } else {
          // 新增图片
          updatedImages.push(newImage);
        }

        updatedSlots[slotIndex].image = newImage;
        updatedSlots[slotIndex].isEmpty = false;

        console.log('更新槽位数据:', slotIndex, newImage.path);
        console.log('updatedSlots[slotIndex]:', updatedSlots[slotIndex]);
        console.log('所有槽位状态:', updatedSlots.map((s, i) => `槽位${i}: isEmpty=${s.isEmpty}`));

        that.setData({
          imageSlots: updatedSlots,
          selectedImages: updatedImages,
          workflowStep: 'editing'
        }, () => {
          // setData完成后重新绘制Canvas
          console.log('setData完成,开始重绘Canvas');
          console.log('当前imageSlots:', that.data.imageSlots);
          setTimeout(() => {
            that.updateCanvas();
          }, 100);
        });

        wx.showToast({
          title: '图片已添加',
          icon: 'success'
        });
      }
    });
  },

  // 移除槽位中的图片
  onSlotRemove (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const slot = this.data.imageSlots[index];

    if (slot.isEmpty) {
      return;
    }

    // 更新槽位
    const updatedSlots = [...this.data.imageSlots];
    const updatedImages = [...this.data.selectedImages];

    // 从selectedImages中移除
    const imageIndex = updatedImages.findIndex(img =>
      img.path === slot.image.path
    );
    if (imageIndex !== -1) {
      updatedImages.splice(imageIndex, 1);
    }

    updatedSlots[index].image = null;
    updatedSlots[index].isEmpty = true;

    this.setData({
      imageSlots: updatedSlots,
      selectedImages: updatedImages
    });

    // 重新绘制Canvas
    if (updatedImages.length > 0) {
      this.updateCanvas();
    } else {
      this.drawPlaceholders();
    }

    wx.showToast({
      title: '已移除',
      icon: 'success'
    });
  },

  // 更换布局 - 保留已有图片
  changeLayout () {
    // 直接返回布局选择页面,不清空图片
    this.setData({
      workflowStep: 'selectLayout'
    });
    console.log('返回布局选择页面,保留已有图片');
  },

  // 切换图片显示模式
  toggleImageFitMode () {
    const newMode = this.data.imageFitMode === 'cover' ? 'contain' : 'cover';
    const modeName = newMode === 'cover' ? '填满' : '完全显示';

    this.setData({
      imageFitMode: newMode
    }, () => {
      // 重新绘制Canvas
      this.updateCanvas();

      wx.showToast({
        title: `图片显示: ${modeName}`,
        icon: 'success',
        duration: 1500
      });
    });

    console.log('切换图片显示模式:', newMode);
  },

  // 切换图片数量分类
  onImageCountSelect (e) {
    const imageCount = parseInt(e.currentTarget.dataset.count);
    console.log('切换到分类:', imageCount);

    this.setData({
      selectedImageCount: imageCount
    });
  },

  // 获取当前显示的布局模板
  getDisplayedTemplates () {
    const { selectedImageCount, layoutGroups } = this.data;

    if (selectedImageCount === 0) {
      // 显示全部
      return this.data.allLayoutTemplates;
    } else {
      // 显示指定数量的布局
      const group = layoutGroups.find(g => g.imageCount === selectedImageCount);
      return group ? group.templates : [];
    }
  },

  // 布局选择 - 新流程 (保留已有图片)
  onLayoutSelect (e) {
    const that = this;
    const index = parseInt(e.currentTarget.dataset.index);
    const templateData = e.currentTarget.dataset.template;
    console.log('选择布局模板:', index, templateData);

    // 获取当前显示的模板列表
    const displayedTemplates = this.getDisplayedTemplates();

    if (index >= 0 && index < displayedTemplates.length) {
      const template = displayedTemplates[index];
      console.log('选中的布局:', template.name, '图片数量:', template.imageCount);

      // 获取当前已有的图片
      const existingImages = [];
      if (this.data.imageSlots && this.data.imageSlots.length > 0) {
        this.data.imageSlots.forEach(slot => {
          if (!slot.isEmpty && slot.image) {
            existingImages.push(slot.image);
          }
        });
      }
      console.log('已有图片数量:', existingImages.length);

      // 初始化新布局的图片槽位,并迁移已有图片
      const imageSlots = [];
      const selectedImages = [];

      for (let i = 0; i < template.imageCount; i++) {
        if (i < existingImages.length) {
          // 迁移已有图片到新布局
          imageSlots.push({
            index: i,
            image: existingImages[i],
            isEmpty: false
          });
          selectedImages.push(existingImages[i]);
          console.log('迁移图片到槽位', i, ':', existingImages[i].path);
        } else {
          // 空槽位
          imageSlots.push({
            index: i,
            image: null,
            isEmpty: true
          });
        }
      }

      console.log('新布局槽位数:', template.imageCount, '已填充:', selectedImages.length);

      this.setData({
        selectedLayout: index,
        currentLayoutTemplate: template,
        imageSlots: imageSlots,
        selectedImages: selectedImages,
        workflowStep: 'addImages'  // 进入添加图片阶段
      }, () => {
        console.log('布局选择完成,准备绘制占位框');
        console.log('ctx存在:', !!that._ctx);
        console.log('canvas存在:', !!that._canvas);

        // 确保Canvas已初始化
        if (!that._ctx || !that._canvas) {
          console.log('Canvas未初始化,等待初始化完成');
          // 等待Canvas初始化
          setTimeout(() => {
            if (that._ctx && that._canvas) {
              that.drawPlaceholders();
            } else {
              console.error('Canvas初始化失败');
              wx.showToast({
                title: 'Canvas初始化失败,请重新进入',
                icon: 'none'
              });
            }
          }, 500);
        } else {
          // Canvas已初始化,检查是否有图片需要绘制
          if (selectedImages.length > 0) {
            // 有图片,直接更新Canvas
            that.updateCanvas();
          } else {
            // 无图片,绘制占位框
            that.drawPlaceholders();
          }
        }
      });

      wx.showToast({
        title: `已选择: ${template.name}`,
        icon: 'success',
        duration: 1500
      });
    }
  },

  // 关闭图片操作遮罩
  closeImageOverlay () {
    this.setData({
      selectedImageIndex: -1
    });
  },

  // 替换图片
  replaceImage (e) {
    const index = parseInt(e.currentTarget.dataset.index);

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          const selectedImages = [...this.data.selectedImages];
          selectedImages[index] = {
            path: res.tempFiles[0].tempFilePath,
            size: res.tempFiles[0].size
          };

          this.setData({
            selectedImages: selectedImages,
            selectedImageIndex: -1
          });

          this.loadImagesInfo(selectedImages).then(() => {
            this.updateCanvas();
          });

          wx.showToast({
            title: '图片已替换',
            icon: 'success'
          });
        }
      }
    });
  },

  // 旋转图片
  rotateImage (e) {
    const index = parseInt(e.currentTarget.dataset.index);

    // 这里可以添加图片旋转逻辑
    // 由于小程序限制，实际旋转需要在canvas中实现
    wx.showToast({
      title: '旋转功能开发中',
      icon: 'none'
    });

    this.setData({
      selectedImageIndex: -1
    });
  },

  // 删除图片
  deleteImage (e) {
    const index = parseInt(e.currentTarget.dataset.index);

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          this.removeImage({ currentTarget: { dataset: { index } } });
          this.setData({
            selectedImageIndex: -1
          });
        }
      }
    });
  }
});
