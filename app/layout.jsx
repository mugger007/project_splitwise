import './globals.css';

export const metadata = {
  title: 'Travel Expense Tracker',
  description: 'Track and split travel expenses among travelers',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>{children}</body>
    </html>
  );
}
