import { NavHeader } from './components/nav-header'

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <NavHeader />
      {children}
    </div>
  )
}
