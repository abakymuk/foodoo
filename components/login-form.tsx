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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Здесь будет логика аутентификации
    // Пока просто перенаправляем на дашборд
    window.location.href = "/dashboard";
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
                  type="email"
                  placeholder="example@email.com"
                  required
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
                <Input id="password" type="password" required />
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full">
                  Войти
                </Button>
                <Button variant="outline" className="w-full">
                  Войти через Google
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Нет аккаунта?{" "}
              <Link href="/register" className="underline underline-offset-4">
                Зарегистрироваться
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
