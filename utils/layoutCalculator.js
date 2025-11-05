/**
 * 布局计算工具类
 * 根据布局模板计算每张图片的实际位置和尺寸
 */

/**
 * 计算布局位置
 * @param {Object} layout - 布局模板对象
 * @param {number} canvasWidth - 画布宽度
 * @param {number} canvasHeight - 画布高度
 * @param {number} spacing - 图片间距
 * @param {number} imageCount - 图片数量
 * @returns {Array} 图片位置数组 [{x, y, width, height}, ...]
 */
function calculateLayout(layout, canvasWidth, canvasHeight, spacing, imageCount) {
  if (!layout) {
    return [];
  }

  if (layout.type === 'grid') {
    return calculateGridLayout(layout, canvasWidth, canvasHeight, spacing, imageCount);
  } else if (layout.type === 'custom') {
    return calculateCustomLayout(layout, canvasWidth, canvasHeight, spacing, imageCount);
  }

  return [];
}

/**
 * 计算网格布局
 * @param {Object} layout - 布局模板
 * @param {number} canvasWidth - 画布宽度
 * @param {number} canvasHeight - 画布高度
 * @param {number} spacing - 图片间距
 * @param {number} imageCount - 图片数量
 * @returns {Array} 图片位置数组
 */
function calculateGridLayout(layout, canvasWidth, canvasHeight, spacing, imageCount) {
  const { rows, cols } = layout;
  const positions = [];

  // 计算每个单元格的尺寸
  const cellWidth = (canvasWidth - spacing * (cols + 1)) / cols;
  const cellHeight = (canvasHeight - spacing * (rows + 1)) / rows;

  // 计算每张图片的位置
  for (let i = 0; i < imageCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    const x = spacing + col * (cellWidth + spacing);
    const y = spacing + row * (cellHeight + spacing);

    positions.push({
      x: x,
      y: y,
      width: cellWidth,
      height: cellHeight
    });
  }

  return positions;
}

/**
 * 计算自定义布局
 * @param {Object} layout - 布局模板
 * @param {number} canvasWidth - 画布宽度
 * @param {number} canvasHeight - 画布高度
 * @param {number} spacing - 图片间距
 * @param {number} imageCount - 图片数量
 * @returns {Array} 图片位置数组
 */
function calculateCustomLayout(layout, canvasWidth, canvasHeight, spacing, imageCount) {
  const { positions: templatePositions } = layout;
  const positions = [];

  if (!templatePositions || templatePositions.length === 0) {
    return positions;
  }

  // 计算可用区域(减去外边距)
  const availableWidth = canvasWidth - spacing * 2;
  const availableHeight = canvasHeight - spacing * 2;

  // 将相对位置转换为绝对位置
  for (let i = 0; i < Math.min(imageCount, templatePositions.length); i++) {
    const template = templatePositions[i];

    // 计算绝对位置(考虑外边距)
    const x = spacing + template.x * availableWidth;
    const y = spacing + template.y * availableHeight;
    const width = template.width * availableWidth;
    const height = template.height * availableHeight;

    // 如果有内部间距,需要调整
    const innerSpacing = spacing / 2;
    
    positions.push({
      x: x + innerSpacing,
      y: y + innerSpacing,
      width: width - innerSpacing * 2,
      height: height - innerSpacing * 2
    });
  }

  return positions;
}

/**
 * 计算图片在单元格内的适配位置(保持宽高比)
 * @param {number} imageWidth - 图片原始宽度
 * @param {number} imageHeight - 图片原始高度
 * @param {number} cellWidth - 单元格宽度
 * @param {number} cellHeight - 单元格高度
 * @param {string} mode - 适配模式: 'cover' | 'contain'
 * @returns {Object} {x, y, width, height, scale}
 */
function calculateImageFit(imageWidth, imageHeight, cellWidth, cellHeight, mode = 'cover') {
  const imageRatio = imageWidth / imageHeight;
  const cellRatio = cellWidth / cellHeight;

  let width, height, x, y, scale;

  if (mode === 'cover') {
    // 填充模式:图片完全覆盖单元格,可能裁剪
    if (imageRatio > cellRatio) {
      // 图片更宽,以高度为准
      height = cellHeight;
      width = height * imageRatio;
      scale = cellHeight / imageHeight;
    } else {
      // 图片更高,以宽度为准
      width = cellWidth;
      height = width / imageRatio;
      scale = cellWidth / imageWidth;
    }
    // 居中
    x = (cellWidth - width) / 2;
    y = (cellHeight - height) / 2;
  } else {
    // 包含模式:图片完全显示在单元格内,可能留白
    if (imageRatio > cellRatio) {
      // 图片更宽,以宽度为准
      width = cellWidth;
      height = width / imageRatio;
      scale = cellWidth / imageWidth;
    } else {
      // 图片更高,以高度为准
      height = cellHeight;
      width = height * imageRatio;
      scale = cellHeight / imageHeight;
    }
    // 居中
    x = (cellWidth - width) / 2;
    y = (cellHeight - height) / 2;
  }

  return {
    x: x,
    y: y,
    width: width,
    height: height,
    scale: scale
  };
}

/**
 * 根据图片数量自动选择最佳布局
 * @param {number} imageCount - 图片数量
 * @param {Array} layouts - 可用布局数组
 * @returns {Object} 推荐的布局
 */
function getRecommendedLayout(imageCount, layouts) {
  if (!layouts || layouts.length === 0) {
    return null;
  }

  // 优先选择网格布局
  const gridLayouts = layouts.filter(l => l.type === 'grid');
  if (gridLayouts.length > 0) {
    // 选择最接近正方形的网格
    return gridLayouts.reduce((best, current) => {
      const bestRatio = Math.abs(best.rows / best.cols - 1);
      const currentRatio = Math.abs(current.rows / current.cols - 1);
      return currentRatio < bestRatio ? current : best;
    });
  }

  // 如果没有网格布局,返回第一个
  return layouts[0];
}

/**
 * 验证布局是否有效
 * @param {Object} layout - 布局对象
 * @param {number} imageCount - 图片数量
 * @returns {boolean} 是否有效
 */
function validateLayout(layout, imageCount) {
  if (!layout) {
    return false;
  }

  if (layout.type === 'grid') {
    const { rows, cols } = layout;
    return rows > 0 && cols > 0 && rows * cols >= imageCount;
  } else if (layout.type === 'custom') {
    const { positions } = layout;
    return positions && positions.length >= imageCount;
  }

  return false;
}

/**
 * 计算画布最佳尺寸
 * @param {number} screenWidth - 屏幕宽度
 * @param {number} screenHeight - 屏幕高度
 * @param {Object} layout - 布局对象
 * @param {number} maxSize - 最大尺寸
 * @returns {Object} {width, height}
 */
function calculateCanvasSize(screenWidth, screenHeight, layout, maxSize = 2048) {
  const margin = 40;
  const availableWidth = screenWidth - margin;
  const availableHeight = screenHeight - margin;

  let width, height;

  if (layout && layout.type === 'grid') {
    const { rows, cols } = layout;
    const ratio = cols / rows;

    if (ratio > 1) {
      // 横向布局
      width = Math.min(availableWidth, maxSize);
      height = width / ratio;
    } else {
      // 竖向布局
      height = Math.min(availableHeight, maxSize);
      width = height * ratio;
    }
  } else {
    // 默认正方形
    const size = Math.min(availableWidth, availableHeight, maxSize);
    width = size;
    height = size;
  }

  return {
    width: Math.floor(width),
    height: Math.floor(height)
  };
}

module.exports = {
  calculateLayout,
  calculateGridLayout,
  calculateCustomLayout,
  calculateImageFit,
  getRecommendedLayout,
  validateLayout,
  calculateCanvasSize
};

