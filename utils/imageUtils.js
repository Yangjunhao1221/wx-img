// 图片处理工具类
class ImageUtils {

  // 压缩图片
  static compressImage (src, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const canvas = wx.createCanvasContext('tempCanvas');
      wx.getImageInfo({
        src: src,
        success: (res) => {
          const { width, height } = res;
          canvas.drawImage(src, 0, 0, width, height);

          wx.canvasToTempFilePath({
            canvasId: 'tempCanvas',
            fileType: 'jpg',
            quality: quality,
            success: resolve,
            fail: reject
          });
        },
        fail: reject
      });
    });
  }

  // 获取图片信息
  static getImageInfo (src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: src,
        success: resolve,
        fail: reject
      });
    });
  }

  // 计算适应尺寸
  static calculateFitSize (imgWidth, imgHeight, containerWidth, containerHeight) {
    const imgRatio = imgWidth / imgHeight;
    const containerRatio = containerWidth / containerHeight;

    let width, height;

    if (imgRatio > containerRatio) {
      // 图片更宽
      width = containerWidth;
      height = containerWidth / imgRatio;
    } else {
      // 图片更高
      height = containerHeight;
      width = containerHeight * imgRatio;
    }

    return { width, height };
  }

  // 计算覆盖尺寸
  static calculateCoverSize (imgWidth, imgHeight, containerWidth, containerHeight) {
    const imgRatio = imgWidth / imgHeight;
    const containerRatio = containerWidth / containerHeight;

    let width, height;

    if (imgRatio > containerRatio) {
      // 图片更宽
      height = containerHeight;
      width = containerHeight * imgRatio;
    } else {
      // 图片更高
      width = containerWidth;
      height = containerWidth / imgRatio;
    }

    return { width, height };
  }

  // 创建圆角路径
  static createRoundedPath (ctx, x, y, width, height, radius) {
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
  }

  // 添加水印
  static addWatermark (ctx, text, x, y, fontSize, opacity, angle) {
    ctx.save();

    ctx.globalAlpha = opacity;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

    ctx.translate(x, y);
    ctx.rotate(angle * Math.PI / 180);
    ctx.fillText(text, 0, 0);

    ctx.restore();
  }

  // 绘制重复水印
  static drawRepeatedWatermark (ctx, canvasWidth, canvasHeight, text, fontSize, opacity, angle, density) {
    const spacing = density === 'dense' ? 100 : density === 'medium' ? 150 : 200;

    for (let x = 0; x < canvasWidth + spacing; x += spacing) {
      for (let y = 0; y < canvasHeight + spacing; y += spacing) {
        this.addWatermark(ctx, text, x, y, fontSize, opacity, angle);
      }
    }
  }
}

module.exports = ImageUtils;
