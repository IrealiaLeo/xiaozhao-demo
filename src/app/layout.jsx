import "./globals.css";

export const metadata = {
  title: "小招同学",
  description: "大学生理财陪伴 AI Demo"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
