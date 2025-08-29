import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function CompletePage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Setup Complete!</CardTitle>
            <CardDescription>Your restaurant is ready to go</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                You&apos;ve successfully set up your restaurant profile and
                basic menu structure. You can now start managing orders and
                customizing your menu.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">What&apos;s next:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Add more menu items and categories</li>
                <li>• Configure payment settings</li>
                <li>• Set up order notifications</li>
                <li>• Customize your restaurant profile</li>
              </ul>
            </div>
            <Button asChild className="w-full">
              <Link href="/app">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
