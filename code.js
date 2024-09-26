// 显示插件 UI，设置宽度和高度
figma.showUI(__html__, { width: 600, height: 500 });

// 加载所有可用的字体并发送到前端 UI
figma.listAvailableFontsAsync().then((fonts) => {
  figma.ui.postMessage({ type: 'fonts-loaded', fonts });
});

// 监听选择变化，检查选中节点的样式是否混合
function checkSelectionStyles() {
  const selectedNodes = figma.currentPage.selection;

  if (selectedNodes.length === 0) {
    return;
  }

  const fontSizeSet = new Set();
  const fontWeightSet = new Set();
  const letterSpacingSet = new Set();
  const lineHeightSet = new Set();

  selectedNodes.forEach(node => {
    if (node.type === 'TEXT') {
      fontSizeSet.add(node.fontSize);
      fontWeightSet.add(node.fontName.style);
      letterSpacingSet.add(node.letterSpacing.value);
      lineHeightSet.add(node.lineHeight.value);
    }
  });

  const fontSize = fontSizeSet.size > 1 ? 'mix' : Array.from(fontSizeSet)[0];
  const fontWeight = fontWeightSet.size > 1 ? 'mix' : Array.from(fontWeightSet)[0];
  const letterSpacing = letterSpacingSet.size > 1 ? 'mix' : Array.from(letterSpacingSet)[0];
  const lineHeight = lineHeightSet.size > 1 ? 'mix' : Array.from(lineHeightSet)[0];

  figma.ui.postMessage({
    type: 'selection-changed',
    fontSize,
    fontWeight,
    letterSpacing,
    lineHeight
  });
}

// 监听选择变化
figma.on('selectionchange', checkSelectionStyles);

// 监听 UI 发来的消息
figma.ui.onmessage = async (msg) => {
  const selectedNodes = figma.currentPage.selection;

  // 检查是否有选中的节点
  if (selectedNodes.length === 0) {
    figma.notify('Please select a frame containing text.');
    return;
  }

  console.log('Processing selection: ', selectedNodes.length, 'nodes selected');

  for (const node of selectedNodes) {
    if (node.type === 'FRAME' || node.type === 'GROUP') {
      const textNodes = node.findAllWithCriteria({ types: ['TEXT'] });

      console.log('Found', textNodes.length, 'text nodes within the selection.');

      for (const textNode of textNodes) {
        const textContent = textNode.characters;

        // 检查文本内容是否为中文
        const isChinese = /[\u4e00-\u9fa5]+/.test(textContent);
        console.log('Text content:', textContent, 'Is Chinese:', isChinese);

        // 应用中文样式，仅针对中文文本
        if (msg.type === 'apply-chinese-styles' && isChinese) {
          console.log('Applying Chinese styles to:', textContent);
          await applyTextStyle(textNode, msg.styles);
        }
        // 应用英文样式，仅针对非中文文本
        else if (msg.type === 'apply-english-styles' && !isChinese) {
          console.log('Applying English styles to:', textContent);
          await applyTextStyle(textNode, msg.styles);
        }
      }
    }
  }

  figma.notify('Text styles updated successfully.');
};

// 应用文本样式的函数
async function applyTextStyle(textNode, styles) {
  // 检查字体和字重，并应用这些值
  if (styles.fontFamily && styles.fontWeight !== 'current') {
    console.log('Applying font family:', styles.fontFamily, 'with weight:', styles.fontWeight);
    await figma.loadFontAsync({ family: styles.fontFamily, style: styles.fontWeight });
    textNode.fontName = { family: styles.fontFamily, style: styles.fontWeight };
  }

  // 处理 fontSize，确保是一个有效的数字
  if (styles.fontSize !== 'current' && !isNaN(parseFloat(styles.fontSize))) {
    console.log('Applying font size:', styles.fontSize);
    textNode.fontSize = parseFloat(styles.fontSize);
  } else {
    console.log('Skipping font size, invalid value or unchanged:', styles.fontSize);
  }

  // 处理 letterSpacing，确保是一个有效的数字
  if (styles.letterSpacing !== 'current' && !isNaN(parseFloat(styles.letterSpacing))) {
    console.log('Applying letter spacing:', styles.letterSpacing);
    textNode.letterSpacing = { value: parseFloat(styles.letterSpacing), unit: "PIXELS" };
  } else {
    console.log('Skipping letter spacing, invalid value or unchanged:', styles.letterSpacing);
  }

  // 处理 lineHeight，确保是一个有效的数字
  if (styles.lineHeight !== 'current' && !isNaN(parseFloat(styles.lineHeight))) {
    console.log('Applying line height:', styles.lineHeight);
    textNode.lineHeight = { value: parseFloat(styles.lineHeight), unit: "PIXELS" };
  } else {
    console.log('Skipping line height, invalid value or unchanged:', styles.lineHeight);
  }

  // 处理 paragraphSpacing
  if (styles.paragraphSpacing !== 'current' && !isNaN(parseFloat(styles.paragraphSpacing))) {
    console.log('Applying paragraph spacing:', styles.paragraphSpacing);
    textNode.paragraphSpacing = parseFloat(styles.paragraphSpacing);
  } else {
    console.log('Skipping paragraph spacing, invalid value or unchanged:', styles.paragraphSpacing);
  }

  // 应用文本大小写和装饰
  textNode.textCase = styles.textCase;
  textNode.textDecoration = styles.textDecoration;
}