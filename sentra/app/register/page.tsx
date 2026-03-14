import { Suspense } from "react";
import RegisterClient from "@/components/RegisterClient";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterClient />
    </Suspense>
  );
}