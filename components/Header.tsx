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
            src="https://bcltraining.com/wp-content/uploads/2022/05/bcl_logo_fullcolor.png"
            alt="logo"
            className=""
            height={50}
            width={50}
          />
        </div>
      <h1 className="font-bold text-xl">Booksmart Consultancy Ltd</h1>
      </Link>

      <div className="px-5 flex items-center gap-3">
        <ThemeToggler/>
        <UserButton afterSignOutUrl="/" />
        <SignedOut>
          <SignInButton afterSignInUrl="/dashboard"  mode="modal" className="font-bold">Sign In</SignInButton>
        </SignedOut>
      </div>
    </header>
  )
}

export default Header