import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, login, getRole } from "../auth/keycloakAuth";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      // Agent / Admin see their dashboard (request management / admin). Others → Intent.
      const role = getRole();
      if (role === "agent" || role === "admin" || role === "superuser") {
        navigate("/dashboard");
      } else {
        navigate("/intent");
      }
      return;
    }
    login();
  }, [navigate]);

  return <p>Redirecting to login...</p>;
}

