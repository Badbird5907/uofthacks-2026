"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/server/better-auth/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignOutPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            localStorage.removeItem("last-used-provider");
            toast.success("Signed out successfully");
            router.push("/auth/sign-in");
            router.refresh();
          },
          onError: (ctx) => {
            toast.error(ctx.error.message);
            setIsLoading(false);
          }
        }
      });
    } catch (error) {
      toast.error("Failed to sign out");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sign Out</CardTitle>
        <CardDescription>
          Are you sure you want to sign out of your account?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          You will need to sign in again to access your account.
        </p>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={handleSignOut}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing out...
            </>
          ) : (
            "Sign Out"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
