import { SignUp } from '@clerk/clerk-react';

export function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg-root">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard"
      />
    </div>
  );
}
