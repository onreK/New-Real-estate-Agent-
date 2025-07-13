import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'BizzyBot AI - AI Business Automation Platform',
  description: 'AI-powered business automation platform with smart lead scoring, automated conversations, and real-time alerts.',
  keywords: 'AI, business automation, lead scoring, chatbot, SMS alerts',
  authors: [{ name: 'BizzyBot AI' }],
  openGraph: {
    title: 'BizzyBot AI - AI Business Automation Platform',
    description: 'Transform your business with AI-powered automation',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        elements: {
          formButtonPrimary: 
            'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
          card: 'shadow-lg',
          headerTitle: 'text-2xl font-bold',
          headerSubtitle: 'text-gray-600',
        },
        variables: {
          colorPrimary: '#2563eb',
          colorBackground: '#ffffff',
          colorText: '#1f2937',
        },
      }}
    >
      <html lang="en">
        <head>
          <link rel="icon" href="/favicon.ico" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body className={`${inter.className} antialiased`}>
          <div id="__next">
            <main className="min-h-screen">
              {children}
            </main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
