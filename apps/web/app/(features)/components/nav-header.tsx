import {
  Header,
  HeaderLogo,
  HeaderActions,
  HeaderNav,
  HeaderNavLink,
} from '@workspace/ui/components/header'

export function NavHeader() {
  return (
    <Header>
      <HeaderLogo>
        <div className="size-7 text-primary">
          <svg
            fill="none"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M6 6H42L36 24L42 42H6L12 24L6 6Z" fill="currentColor" />
          </svg>
        </div>
        <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground">
          MultiAI PDF Uploader
        </h2>
      </HeaderLogo>
      <HeaderActions>
        <HeaderNav>
          <HeaderNavLink href="/">Home</HeaderNavLink>
          <HeaderNavLink href="/base">Base de Conhecimento</HeaderNavLink>
        </HeaderNav>
        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/60 bg-gradient-to-br from-primary/20 to-primary/40 shadow-sm" />
      </HeaderActions>
    </Header>
  )
}
