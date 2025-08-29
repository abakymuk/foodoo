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

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Здесь будет логика регистрации
    // Пока просто перенаправляем на дашборд
    window.location.href = "/dashboard";
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
                <Input id="name" type="text" placeholder="Ваше имя" required />
              </div>
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
                <Label htmlFor="password">Пароль</Label>
                <Input id="password" type="password" required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                <Input id="confirm-password" type="password" required />
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full">
                  Зарегистрироваться
                </Button>
                <Button variant="outline" className="w-full">
                  Регистрация через Google
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Уже есть аккаунт?{" "}
              <Link href="/" className="underline underline-offset-4">
                Войти
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
