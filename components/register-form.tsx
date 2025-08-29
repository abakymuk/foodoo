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

export function RegisterForm({
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
    const confirmPassword = formData.get("confirm-password") as string;

    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) {
        toast.error("Ошибка регистрации", {
          description: error.message,
        });
      } else {
        toast.success("Регистрация успешна", {
          description: "Проверьте email для подтверждения",
        });
        router.push("/sign-in");
      }
    } catch {
      toast.error("Произошла ошибка", {
        description: "Попробуйте еще раз",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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
        toast.error("Ошибка регистрации через Google", {
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
          <CardTitle>Регистрация</CardTitle>
          <CardDescription>Создайте новый аккаунт</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Ваше имя"
                  required
                  disabled={isLoading}
                />
              </div>
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
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignUp}
                  disabled={isLoading}
                  type="button"
                >
                  {isLoading ? "Регистрация..." : "Регистрация через Google"}
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Уже есть аккаунт?{" "}
              <Link href="/sign-in" className="underline underline-offset-4">
                Войти
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
