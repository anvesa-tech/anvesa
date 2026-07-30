export const metadata = {
  title: 'ANVESA API',
  description: 'Buy what’s verified, not what’s marketed.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
