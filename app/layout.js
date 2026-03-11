import "./globals.css";

export const metadata = {
  title: "Scan2Sustain",
  description: "Smart QR Based Cleanliness Reporting System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
