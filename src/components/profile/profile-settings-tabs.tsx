"use client"

import { useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { themeActiveTabTriggerClassName } from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"

import { ChangePasswordForm } from "./change-password-form"
import { EmailSignatureForm } from "./email-signature-form"
import { UserProfileForm } from "./user-profile-form"

export function ProfileSettingsTabs() {
  const [activeTab, setActiveTab] = useState("profile")

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account details, password, and email signature.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="profile"
            className={cn(themeActiveTabTriggerClassName, "rounded-none shadow-none")}
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="password"
            className={cn(themeActiveTabTriggerClassName, "rounded-none shadow-none")}
          >
            Change Password
          </TabsTrigger>
          <TabsTrigger
            value="signature"
            className={cn(themeActiveTabTriggerClassName, "rounded-none shadow-none")}
          >
            Email Signature
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          {activeTab === "profile" ? <UserProfileForm /> : null}
        </TabsContent>

        <TabsContent value="password" className="mt-4">
          <ChangePasswordForm />
        </TabsContent>

        <TabsContent value="signature" className="mt-4">
          {activeTab === "signature" ? <EmailSignatureForm /> : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
