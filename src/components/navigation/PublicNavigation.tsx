import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, Sun, Moon } from "lucide-react";
import { Brand } from "../common";
import { useAuth } from "../../contexts/AuthContext";
import { useAppearance } from "../../contexts/AppearanceContext";
export function PublicNavigation() {
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const appearance = useAppearance();
  return (
    <header className="public-nav premium-nav">
      <Link to="/" onClick={() => setOpen(false)}>
        <Brand />
      </Link>
      <button
        className="icon-button public-menu"
        aria-label="Toggle public navigation"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      <nav className={open ? "expanded" : ""} aria-label="Public navigation">
        <NavLink to="/about" onClick={() => setOpen(false)}>
          About
        </NavLink>
        <NavLink to="/developer" onClick={() => setOpen(false)}>
          Developer
        </NavLink>
        <NavLink to="/privacy" onClick={() => setOpen(false)}>
          Privacy
        </NavLink>
        <NavLink to="/terms" onClick={() => setOpen(false)}>
          Terms
        </NavLink>
        <button
          className="icon-button"
          aria-label="Toggle light or dark theme"
          onClick={() =>
            appearance.update({
              theme:
                document.documentElement.dataset.theme === "dark"
                  ? "light"
                  : "dark",
            })
          }
        >
          {document.documentElement.dataset.theme === "dark" ? (
            <Sun size={19} />
          ) : (
            <Moon size={19} />
          )}
        </button>
        {auth.session ? (
          <Link
            className="button"
            to={auth.role ? "/admin" : "/student"}
            onClick={() => setOpen(false)}
          >
            Open portal
          </Link>
        ) : (
          <>
            <NavLink to="/login" onClick={() => setOpen(false)}>
              Sign in
            </NavLink>
            <Link
              className="button"
              to="/signup"
              onClick={() => setOpen(false)}
            >
              Join the class
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
