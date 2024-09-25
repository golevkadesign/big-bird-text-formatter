// Figma 插件入口，显示 UI 界面
figma.showUI(__html__, { width: 600, height: 500 });

// 获取 Figma 中所有已加载的字体，并发送给 UI 界面
figma.listAvailableFontsAsync().then((fonts) => {
  figma.ui.postMessage({ type: 'fonts-loaded', fonts });
});

// 监听 UI 发送的消息
figma.ui.onmessage = async (msg) => {
  const selectedNodes = figma.currentPage.selection;

  // 检查是否有选中的节点
  if (selectedNodes.length === 0) {
    figma.notify('请选择一个包含文本的 frame。');
    return;
  }

  // 遍历所有选中的 frame 和 text 节点
  for (const node of selectedNodes) {
    if (node.type === 'FRAME') {
      const textNodes = node.findAllWithCriteria({ types: ['TEXT'] });
      for (const textNode of textNodes) {
        const textContent = textNode.characters;

        // 应用中文样式
        if (/[\u4e00-\u9fa5]/.test(textContent) && msg.type === 'apply-chinese-styles') {
          await applyTextStyle(textNode, msg.styles);
        } 
        // 应用英文样式
        else if (!/[\u4e00-\u9fa5]/.test(textContent) && msg.type === 'apply-english-styles') {
          await applyTextStyle(textNode, msg.styles);
        }
      }
    }
  }

  figma.notify('文本属性已成功更新。');
};

// 应用文本样式函数，处理所有 Typography 相关属性
async function applyTextStyle(textNode, styles) {
  await figma.loadFontAsync({ family: styles.fontFamily, style: styles.fontWeight });
  textNode.fontName = { family: styles.fontFamily, style: styles.fontWeight };
  textNode.fontSize = styles.fontSize;
  textNode.letterSpacing = { value: styles.letterSpacing, unit: "PIXELS" };
  textNode.lineHeight = { value: styles.lineHeight, unit: "PIXELS" };
  textNode.paragraphSpacing = styles.paragraphSpacing;
  textNode.textCase = styles.textCase;
  textNode.textDecoration = styles.textDecoration;
}