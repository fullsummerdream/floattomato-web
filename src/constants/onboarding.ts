// 引导页 localStorage 标识键 — 独立常量文件，避免 App.tsx 引用拉爆首屏 chunk
// 引入此键的页面（App.tsx 重定向 + OnboardingPage finish 写入）只需 4 个字符串字节
export const ONBOARDED_KEY = 'floattomato:onboarded'
