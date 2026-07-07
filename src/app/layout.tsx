import type { Metadata } from "next";
import { Prompt, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const prompt = Prompt({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  variable: "--font-prompt",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  weight: ["400", "500", "600"],
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบเช็คชื่อและตัดเกรดนักศึกษา",
  description: "ระบบเช็คเข้าเรียนด้วย QR Code และคำนวณเกรดอัตโนมัติ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${prompt.variable} ${notoSansThai.variable} h-full`}>
      <body className="font-[family-name:var(--font-body)] bg-app-bg text-ink antialiased min-h-full">
        {children}
      </body>
    </html>
  );
}
