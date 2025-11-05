// Canvas绘制工具类
class CanvasUtils {

  // 绘制文本
  static drawText (ctx, text, x, y, options = {}) {
    const {
      fontSize = 16,
      fontFamily = 'sans-serif',
      color = '#000000',
      align = 'left',
      baseline = 'top',
      strokeColor = '',
      strokeWidth = 0,
      maxWidth
    } = options;

    ctx.save();
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;

    if (strokeColor && strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.strokeText(text, x, y, maxWidth);
    }

    ctx.fillText(text, x, y, maxWidth);
    ctx.restore();
  }

  // 绘制箭头
  static drawArrow (ctx, fromX, fromY, toX, toY, options = {}) {
    const {
      color = '#FF0000',
      width = 2,
      headSize = 10
    } = options;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;

    // 绘制箭头线
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // 计算箭头头部
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const headlen = headSize;

    // 绘制箭头头部
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headlen * Math.cos(angle - Math.PI / 6),
      toY - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headlen * Math.cos(angle + Math.PI / 6),
      toY - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // 绘制矩形框
  static drawRect (ctx, x, y, width, height, options = {}) {
    const {
      fillColor = '',
      strokeColor = '#FF0000',
      strokeWidth = 2,
      cornerRadius = 0,
      dash = []
    } = options;

    ctx.save();

    if (dash.length > 0) {
      ctx.setLineDash(dash);
    }

    ctx.lineWidth = strokeWidth;

    if (cornerRadius > 0) {
      this.createRoundedPath(ctx, x, y, width, height, cornerRadius);
    } else {
      ctx.rect(x, y, width, height);
    }

    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }

    ctx.restore();
  }

  // 绘制圆圈
  static drawCircle (ctx, x, y, radius, options = {}) {
    const {
      fillColor = '',
      strokeColor = '#FF0000',
      strokeWidth = 2,
      dash = []
    } = options;

    ctx.save();

    if (dash.length > 0) {
      ctx.setLineDash(dash);
    }

    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);

    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }

    ctx.restore();
  }

  // 创建圆角路径
  static createRoundedPath (ctx, x, y, width, height, radius) {
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

  // 测量文本尺寸
  static measureText (ctx, text, fontSize, fontFamily = 'sans-serif') {
    ctx.save();
    ctx.font = `${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    ctx.restore();
    return {
      width: metrics.width,
      height: fontSize
    };
  }

  // 获取像素数据
  static getImageData (ctx, x, y, width, height) {
    return ctx.getImageData(x, y, width, height);
  }

  // 设置像素数据
  static putImageData (ctx, imageData, x, y) {
    ctx.putImageData(imageData, x, y);
  }
}

module.exports = CanvasUtils;
