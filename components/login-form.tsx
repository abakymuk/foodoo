"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { createClient } from "@/lib/auth/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import * as React from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Ошибка входа", {
          description: error.message,
        });
      } else {
        toast.success("Успешный вход");
        router.push("/app");
        router.refresh();
      }
    } catch {
      toast.error("Произошла ошибка", {
        description: "Попробуйте еще раз",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) {
        toast.error("Ошибка входа через Google", {
          description: error.message,
        });
      }
    } catch {
      toast.error("Произошла ошибка", {
        description: "Попробуйте еще раз",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Вход в аккаунт</CardTitle>
          <CardDescription>
            Введите ваш email для входа в аккаунт
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Пароль</Label>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Забыли пароль?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Вход..." : "Войти"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  type="button"
                >
                  {isLoading ? "Вход..." : "Войти через Google"}
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Нет аккаунта?{" "}
              <Link href="/sign-up" className="underline underline-offset-4">
                Зарегистрироваться
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
