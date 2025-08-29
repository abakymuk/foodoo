"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

interface ThemeToggleButtonProps {
  className?: string
  size?: "sm" | "default" | "lg" | "icon"
}

export function ThemeToggleButton({ 
  className = "", 
  size = "icon" 
}: ThemeToggleButtonProps) {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={toggleTheme}
      className={`rounded-full ${className}`}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">Переключить тему</span>
    </Button>
  )
}