/**
 * 设计 Token（文档 §12.2 唯一真源）。
 * 全站仅通过 ConfigProvider 注入，禁止在业务代码硬编码颜色/字号。
 */
export const themeTokens = {
  colorPrimary: '#1677FF',
  colorSuccess: '#52C41A',
  colorWarning: '#FAAD14',
  colorError: '#FF4D4F',
  colorInfo: '#1677FF',
  colorText: '#1F1F1F',
  colorTextSecondary: '#595959',
  colorBorder: '#D9D9D9',
  colorBgLayout: '#F5F5F5',
  borderRadius: 6,
  fontSize: 14,
};
