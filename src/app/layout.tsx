import "./globals.css";

export const metadata = {
  title: "Media Grabber",
  description: "Download high-quality video and audio from anywhere.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
