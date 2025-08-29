"use client";

import * as React from "react";
import { useTransition } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSettings, updateSettings } from "../actions/settings";
import { toast } from "sonner";

type SettingsData = {
  brand_name: string;
  currency: "EUR" | "USD";
  location_name: string;
};

export default function SettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = React.useState(true);
  const [settings, setSettings] = React.useState<SettingsData>({
    brand_name: "",
    currency: "EUR",
    location_name: "",
  });

  // Загружаем настройки при монтировании компонента
  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    const result = await getSettings();
    if (result.ok && result.data) {
      setSettings({
        brand_name: result.data.tenant.brand_name,
        currency: result.data.tenant.currency,
        location_name: result.data.location?.name || "",
      });
    }
    setIsLoading(false);
  };

  const onSaveChanges = () => {
    startTransition(async () => {
      const result = await updateSettings(settings);
      if (result.ok) {
        toast.success("Settings saved", {
          description: "Your changes have been saved successfully.",
        });
      } else {
        toast.error("Failed to save settings", {
          description: result.error || "Please try again.",
        });
      }
    });
  };

  const handleInputChange = (field: keyof SettingsData, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Settings"
          description="Configure your application settings"
        />
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Settings"
        description="Configure your application settings"
        actions={
          <Button onClick={onSaveChanges} disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        }
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand_name">Brand Name</Label>
                <Input
                  id="brand_name"
                  value={settings.brand_name}
                  onChange={(e) =>
                    handleInputChange("brand_name", e.target.value)
                  }
                  placeholder="Your restaurant name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(value: "EUR" | "USD") =>
                    handleInputChange("currency", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Location Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location_name">Location Name</Label>
                <Input
                  id="location_name"
                  value={settings.location_name}
                  onChange={(e) =>
                    handleInputChange("location_name", e.target.value)
                  }
                  placeholder="Your location name"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
