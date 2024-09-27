// 显示插件 UI，设置宽度和高度
figma.showUI(__html__, { width: 600, height: 500 });

// 加载所有可用的字体并发送到前端 UI
figma.listAvailableFontsAsync().then((fonts) => {
  figma.ui.postMessage({ type: 'fonts-loaded', fonts });

  // 确保在 UI 加载后立即检查当前的选中状态
  checkSelectionStyles(); // 调用检查样式的函数
});

// 检查选中的文本节点的样式是否混合
function checkSelectionStyles() {
  const selectedNodes = figma.currentPage.selection;

  if (selectedNodes.length === 0) {
    return;
  }

  let fontSize, fontWeight, letterSpacing, lineHeight;
  let hasMixedFontSize = false;
  let hasMixedFontWeight = false;
  let hasMixedLetterSpacing = false;
  let hasMixedLineHeight = false;

  selectedNodes.forEach(node => {
    if (node.type === 'TEXT') {
      if (fontSize === undefined) {
        fontSize = node.fontSize;
      } else if (fontSize !== node.fontSize) {
        hasMixedFontSize = true;
      }

      if (fontWeight === undefined) {
        fontWeight = node.fontName.style;
      } else if (fontWeight !== node.fontName.style) {
        hasMixedFontWeight = true;
      }

      if (letterSpacing === undefined) {
        letterSpacing = node.letterSpacing.value;
      } else if (letterSpacing !== node.letterSpacing.value) {
        hasMixedLetterSpacing = true;
      }

      if (lineHeight === undefined) {
        lineHeight = node.lineHeight.value;
      } else if (lineHeight !== node.lineHeight.value) {
        hasMixedLineHeight = true;
      }
    }
  });

  figma.ui.postMessage({
    type: 'selection-changed',
    fontSize: hasMixedFontSize ? 'mix' : fontSize,
    fontWeight: hasMixedFontWeight ? 'mix' : fontWeight,
    letterSpacing: hasMixedLetterSpacing ? 'mix' : letterSpacing,
    lineHeight: hasMixedLineHeight ? 'mix' : lineHeight
  });
}

// 监听选择变化
figma.on('selectionchange', checkSelectionStyles);

// 优化样式应用逻辑，确保批量处理时不会导致卡顿
figma.ui.onmessage = async (msg) => {
  const selectedNodes = figma.currentPage.selection;

  if (selectedNodes.length === 0) {
    figma.notify('Please select a frame containing text.');
    return;
  }

  const applyTextStylesToNodes = async (textNodes) => {
    for (const textNode of textNodes) {
      const textContent = textNode.characters;
      const isChinese = /[\u4e00-\u9fa5]+/.test(textContent);

      // 应用中文样式，仅针对中文文本
      if (msg.type === 'apply-chinese-styles' && isChinese) {
        await applyTextStyle(textNode, msg.styles);
      }
      // 应用英文样式，仅针对非中文文本
      else if (msg.type === 'apply-english-styles' && !isChinese) {
        await applyTextStyle(textNode, msg.styles);
      }
    }
  };

  // 对每个选中的 frame 或 group 进行处理
  for (const node of selectedNodes) {
    if (node.type === 'FRAME' || node.type === 'GROUP') {
      const textNodes = node.findAllWithCriteria({ types: ['TEXT'] });
      await applyTextStylesToNodes(textNodes);
    } else if (node.type === 'TEXT') {
      await applyTextStylesToNodes([node]);
    }
  }

  figma.notify('Text styles updated successfully.');
};

// 改进后的样式应用函数，确保对每个属性进行更精确的应用
async function applyTextStyle(textNode, styles) {
  if (styles.fontFamily && styles.fontWeight !== 'current') {
    await figma.loadFontAsync({ family: styles.fontFamily, style: styles.fontWeight });
    textNode.fontName = { family: styles.fontFamily, style: styles.fontWeight };
  }

  if (styles.fontSize !== 'current' && !isNaN(parseFloat(styles.fontSize))) {
    textNode.fontSize = parseFloat(styles.fontSize);
  }

  if (styles.letterSpacing !== 'current' && !isNaN(parseFloat(styles.letterSpacing))) {
    textNode.letterSpacing = { value: parseFloat(styles.letterSpacing), unit: "PIXELS" };
  }

  if (styles.lineHeight !== 'current' && !isNaN(parseFloat(styles.lineHeight))) {
    textNode.lineHeight = { value: parseFloat(styles.lineHeight), unit: "PIXELS" };
  }

  if (styles.paragraphSpacing !== 'current' && !isNaN(parseFloat(styles.paragraphSpacing))) {
    textNode.paragraphSpacing = parseFloat(styles.paragraphSpacing);
  }

  textNode.textCase = styles.textCase;
  textNode.textDecoration = styles.textDecoration;
}