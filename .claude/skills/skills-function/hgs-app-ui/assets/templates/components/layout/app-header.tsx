import { Bell } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-header-foreground/15 bg-header px-4 text-header-foreground">
      <SidebarTrigger className="text-header-foreground/70 hover:bg-header-foreground/10 hover:text-header-foreground" />
      <Separator orientation="vertical" className="h-6 bg-header-foreground/15" />
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        className="text-header-foreground/70 hover:bg-header-foreground/10 hover:text-header-foreground"
      >
        <Bell />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Account"
              className="hover:bg-header-foreground/10"
            />
          }
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-header-foreground/15 text-header-foreground">HG</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Profile</DropdownMenuItem>
            <DropdownMenuItem disabled>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Sign out</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
