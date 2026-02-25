import { loginTranslations } from "@/types/translations";
import LoginForm from "@/components/LoginClient";

export default function Login() {
  return <LoginForm translations={loginTranslations} defaultLanguage="en" />;
}