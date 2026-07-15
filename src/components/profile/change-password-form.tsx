"use client"

import { useMemo, useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { changePassword, getProfileAuthToken } from "@/lib/profile/profile-api"
import { themePrimaryButtonSmClassName } from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"

const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "uppercase", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lowercase", label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { id: "number", label: "One number", test: (v: string) => /\d/.test(v) },
  {
    id: "special",
    label: "One special character",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
] as const

export function ChangePasswordForm() {
  const { toast } = useToast()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(newPassword) })),
    [newPassword]
  )

  const allRulesMet = ruleResults.every((rule) => rule.met)
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword
  const canSubmit = allRulesMet && passwordsMatch && !isSaving

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!canSubmit) return

    const token = getProfileAuthToken()
    if (!token) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You are not logged in.",
      })
      return
    }

    setIsSaving(true)
    try {
      const result = await changePassword(token, newPassword)
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to change password.",
        })
        return
      }

      setNewPassword("")
      setConfirmPassword("")
      toast({
        title: "Password updated",
        description: result.message || "Your password has been changed successfully.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showNewPassword ? "Hide password" : "Show password"}
                  </span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showConfirmPassword ? "Hide password" : "Show password"}
                  </span>
                </Button>
              </div>
              {confirmPassword && !passwordsMatch ? (
                <p className="text-sm text-destructive">Passwords do not match</p>
              ) : null}
            </div>
          </div>

          {newPassword ? (
            <ul className="space-y-1.5 rounded-md border border-border bg-muted/30 p-3">
              {ruleResults.map((rule) => (
                <li
                  key={rule.id}
                  className={cn(
                    "text-sm",
                    rule.met ? "text-emerald-600" : "text-muted-foreground"
                  )}
                >
                  {rule.met ? "✓" : "○"} {rule.label}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              className={themePrimaryButtonSmClassName}
              disabled={!canSubmit}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Password"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
