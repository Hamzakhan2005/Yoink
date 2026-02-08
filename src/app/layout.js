import "./globals.css";

export const metadata = {
  title: "Yoink - Secure File Sharing",
  description: "Peer-to-peer file sharing with no server required",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
