import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function WelcomePage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to Potlucky</CardTitle>
            <CardDescription>
              Let&apos;s get your restaurant set up in just a few steps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">What we&apos;ll set up:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Your restaurant profile</li>
                <li>• Basic menu structure</li>
                <li>• Order management</li>
                <li>• Payment settings</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link href="/onboarding/restaurant">Get Started</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/app">Skip for now</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
