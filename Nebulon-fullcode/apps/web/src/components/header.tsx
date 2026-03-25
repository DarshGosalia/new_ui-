import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/anti", label: "Supplier IQ" },
    { to: "/customers", label: "Customers" },
    { to: "/business-chatbot", label: "Business Chatbot" },
    { to: "/insta", label: "Insta" },
    { to: "/insta/inventory", label: "Inventory" },
    { to: "/builder", label: "Builder" },
  ] as const;

  return (
    <div className="bg-[#2D5F5D] shadow-md">
      <div className="flex flex-row items-center justify-between px-5 py-2.5">
        <nav className="flex gap-5 text-[0.95rem] font-medium">
          {links.map(({ to, label }) => {
            return (
              <Link
                key={to}
                to={to}
                className="text-white/85 transition-colors duration-200 hover:text-[#C5A03F] [&.active]:text-[#C5A03F] [&.active]:font-semibold"
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
