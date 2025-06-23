import './globals.css'

export const metadata = {
  title: 'Amanda the Realtor - Your Richmond & Chester Real Estate Expert',
  description: 'Professional real estate services in Richmond & Chester, Virginia. Schedule your free consultation today!',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
