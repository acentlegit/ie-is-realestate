import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, login } from "../auth/keycloakAuth";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (isAuthenticated()) {
      navigate("/dashboard");
      return;
    }
    // Otherwise, redirect to Keycloak login
    login();
  }, [navigate]);

  return <p>Redirecting to login...</p>;
}

