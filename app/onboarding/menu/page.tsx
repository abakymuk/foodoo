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

export default function MenuPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Menu Setup</CardTitle>
            <CardDescription>
              Let&apos;s create your first menu category
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category Name</Label>
              <Input
                id="category"
                placeholder="e.g., Main Dishes, Appetizers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Category Description</Label>
              <Input
                id="description"
                placeholder="Brief description of this category"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item">Sample Item</Label>
              <Input id="item" placeholder="e.g., Margherita Pizza" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" placeholder="0.00" type="number" step="0.01" />
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link href="/onboarding/complete">Complete Setup</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/app">Skip</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
