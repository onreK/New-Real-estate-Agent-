import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AI Real Estate Assistant',
  description: 'AI-powered chatbot platform for real estate professionals',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        elements: {
          formButtonPrimary: 
            'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
        },
      }}
    >
      <html lang="en">
        <body className={inter.className}>
          <main>
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}
