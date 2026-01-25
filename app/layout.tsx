import "./globals.css";

export const metadata = {
  title: "MasteraSet",
  description: "Track and manage your card sets",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
