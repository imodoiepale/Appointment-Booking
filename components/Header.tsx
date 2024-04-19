import { SignInButton, SignedOut, UserButton } from "@clerk/nextjs"
import Image from "next/image"
import Link from "next/link"
import { ThemeToggler } from "./ui/ThemeToggler"


const Header = () => {
  return (
    <header className="flex justify-between my-10 items-center">
      
      <Link href={"/"} className="flex pl-3">
        <div className="px-5 flex items-center">
          <Image
            src="/logo.png"
            alt="logo"
            className=""
            height={50}
            width={50}
          />
      <p className="font-bold text-sm lg:text-xl ">Booksmart Consultancy Ltd</p>
        </div>
      </Link>

      <div className="px-5 flex items-center gap-3">
        <div className="hidden sm:block">
          <ThemeToggler />
        </div>
        <UserButton afterSignOutUrl="/" />
        <SignedOut>
          <SignInButton afterSignInUrl="/dashboard" mode="modal"
          // @ts-ignore
            className="font-bold">Sign In</SignInButton>
        </SignedOut>
      </div>
    </header>
  )
}

export default Header