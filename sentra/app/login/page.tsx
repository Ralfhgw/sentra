import { Suspense } from "react";
import { loginTranslations } from "@/types/translations";
import LoginForm from "@/components/LoginClient";

export default function Login() {
    return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm translations={loginTranslations} defaultLanguage="en" />
    </Suspense>
  );
}