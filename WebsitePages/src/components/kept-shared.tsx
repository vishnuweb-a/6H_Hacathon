import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Bell, MapPin, ShieldCheck, Star, ArrowRight, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/auth-context";
import { useSignOut } from "@/hooks/use-auth-mutations";

export function KeptHeader() {
  const { isAuthenticated } = useAuth();
  const signOutMutation = useSignOut();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="bg-lime border-b-2 border-foreground py-2 text-center eyebrow flex justify-center gap-3">
        <span className="hidden sm:inline">GOOD PEOPLE. LOST THINGS. HAPPY REUNIONS.</span>
        <span className="sm:hidden">YOUR CAMPUS. YOUR COMMUNITY.</span>
        <Star size={12} fill="currentColor" />
        <span>CAMPUS EDITION</span>
      </div>
      <header className="border-b-2 border-foreground bg-background">
        <div className="page-width h-24 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="font-extrabold text-5xl flex items-center gap-1"
            aria-label="Kept home"
          >
            kept<span className="text-pink">✳</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            <Link to="/explore" className="nav-link">
              The board
            </Link>
            <Link to="/matches" className="nav-link">
              My matches <span className="bg-pink px-1 ml-1">3</span>
            </Link>
            <Link to="/activity" className="nav-link">
              My activity
            </Link>
            <Link to="/messages" className="nav-link">
              Messages
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" aria-label="Notifications">
              <Link to="/notifications">
                <Bell size={20} />
              </Link>
            </Button>
            <div className="hidden md:block">
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  disabled={signOutMutation.isPending}
                  onClick={() => signOutMutation.mutate()}
                >
                  {signOutMutation.isPending ? "Signing out…" : "Sign out"}
                </Button>
              ) : (
                <Link to="/auth" search={{ redirect: undefined }} className="text-sm font-semibold">
                  Sign in
                </Link>
              )}
            </div>
            <Button asChild variant="pink" className="hidden sm:inline-flex">
              <Link to="/post">
                Post an item <ArrowUpRight />
              </Link>
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="lg:hidden"
              aria-label={open ? "Close navigation" : "Open navigation"}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {open && (
          <nav className="page-width flex flex-wrap gap-2 pb-4" onClick={() => setOpen(false)}>
            <Link className="nav-link" to="/explore">
              The board
            </Link>
            <Link className="nav-link" to="/matches">
              Matches
            </Link>
            <Link className="nav-link" to="/activity">
              Activity
            </Link>
            <Link className="nav-link" to="/messages">
              Messages
            </Link>
            <Link className="nav-link" to="/profile">
              Profile
            </Link>
            {isAuthenticated ? (
              <button
                type="button"
                className="nav-link"
                disabled={signOutMutation.isPending}
                onClick={() => signOutMutation.mutate()}
              >
                Sign out
              </button>
            ) : (
              <Link className="nav-link" to="/auth" search={{ redirect: undefined }}>
                Sign in
              </Link>
            )}
            <Link className="nav-link" to="/post">
              Post an item
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
export function KeptFooter() {
  return (
    <footer className="border-t-2 border-foreground mt-16">
      <div className="page-width py-9 flex flex-wrap items-center justify-between gap-6">
        <div>
          <Link to="/" className="text-3xl font-extrabold">
            kept✳
          </Link>
          <p className="text-xs mt-1">Lost it. Find it. Get it back.</p>
        </div>
        <div className="flex gap-6 text-xs font-semibold">
          <Link to="/safety">Safety & privacy</Link>
          <Link to="/profile">Your trust profile</Link>
          <Link to="/claims">Your claims</Link>
        </div>
        <span className="eyebrow text-muted-foreground">MADE FOR YOUR CAMPUS, WITH CARE.</span>
      </div>
    </footer>
  );
}
export function Page({
  eyebrow,
  title,
  description,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <main className="page-width pt-12 pb-6 min-h-[65vh]">
      <div className="flex flex-wrap items-end justify-between gap-5 mb-9">
        <div>
          <p className="eyebrow mb-3">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          {description && <p className="text-muted-foreground mt-4 max-w-2xl">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </main>
  );
}
export function Badge({ children, tone = "lime" }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className={`eyebrow border border-foreground px-2 py-1 inline-flex items-center gap-1 ${tone === "pink" ? "bg-pink" : tone === "mint" ? "bg-mint" : tone === "orange" ? "bg-orange" : tone === "purple" ? "bg-purple text-primary-foreground" : "bg-lime"}`}
    >
      {children}
    </span>
  );
}
export function TrustNote({
  children = "Only the right person gets the right thing. Private details stay private.",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="flex gap-3 bg-mint/30 border-2 border-foreground p-4 text-sm">
      <ShieldCheck className="shrink-0" size={20} />
      <div>{children}</div>
    </div>
  );
}
export function Tabs({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-6" role="tablist">
      {options.map((option) => (
        <Button
          key={option}
          role="tab"
          aria-selected={option === value}
          variant={option === value ? "lime" : "outline"}
          onClick={() => onChange(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}
export function SectionHeading({
  title,
  kicker,
  to,
}: {
  title: string;
  kicker: string;
  to?: "/explore" | "/matches" | "/activity";
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <p className="eyebrow mb-2">{kicker}</p>
        <h2 className="section-title">{title}</h2>
      </div>
      {to && (
        <Link to={to} className="subtle-link flex gap-2 items-center">
          View all <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
