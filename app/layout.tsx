import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bikes',
  description: 'Интернет-магазин велосипедов в Беларуси',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
