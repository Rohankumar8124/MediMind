import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from './context/ThemeContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Healmate AI - Your Intelligent Health Assistant",
  description: "AI-powered health assistant that helps you track symptoms, get medicine suggestions, and manage your health schedule with smart notifications.",
  keywords: "AI doctor, health assistant, symptom checker, medicine reminder, health AI",
};

// Custom Clerk appearance to match our minimalist pistachio theme
const clerkAppearance = {
  variables: {
    colorPrimary: '#93c572',
    colorText: '#1a1a1a',
    colorTextSecondary: '#4a5568',
    colorBackground: '#ffffff',
    colorInputBackground: '#f8f9fa',
    colorInputText: '#1a1a1a',
    borderRadius: '12px',
    fontFamily: 'var(--font-geist-sans), -apple-system, sans-serif',
  },
  elements: {
    card: 'shadow-lg border border-gray-200',
    formButtonPrimary: 'bg-[#93c572] hover:bg-[#7ab356] text-white',
    formFieldInput: 'border-gray-200 focus:border-[#93c572] focus:ring-[#93c572]',
    footerActionLink: 'text-[#93c572] hover:text-[#7ab356]',
    identityPreviewEditButton: 'text-[#93c572]',
    userButtonPopoverCard: 'border border-gray-200 shadow-lg',
    userButtonPopoverActionButton: 'hover:bg-[#eef5e9]',
    userButtonPopoverActionButtonText: 'text-gray-700',
    userButtonPopoverFooter: 'hidden',
  },
};

// Script to set theme before React hydrates (prevents flash)
const themeScript = `
  (function() {
    try {
      const theme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (theme === 'dark' || (!theme && prefersDark)) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/favicon.ico" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#f8f9fa" />
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-900 transition-colors duration-300`}>
          <ThemeProvider>
            <div className="bg-animated"></div>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
