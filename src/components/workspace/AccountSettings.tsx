"use client";
import { useState, type FormEvent } from "react";
import VerifyEmailNotice from "./VerifyEmailNotice";
import { apiClient } from "@/lib/api-client";
import {
  useResource,
  PageHeader,
  Panel,
  LoadState,
  Icon,
  Badge,
  errorMessage,
  date,
} from "./WorkspaceUI";
import { type WorkspaceUser } from "./WorkspaceShell";

export default function AccountSettings() {
  const {
    data: user,
    error,
    loading,
    reload,
  } = useResource<WorkspaceUser>("/auth/me/");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState("");
  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving("profile");
    setFormError("");
    setMessage("");
    try {
      await apiClient.patch("/auth/me/", {
        username: String(form.get("username")).trim(),
        phone: String(form.get("phone")).trim(),
      });
      setMessage("Your profile has been updated.");
      reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSaving("");
    }
  };
  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    if (form.get("new_password") !== form.get("confirm_password")) {
      setFormError("Your new passwords do not match.");
      return;
    }
    setSaving("password");
    setFormError("");
    setMessage("");
    try {
      await apiClient.post("/auth/password/change/", {
        current_password: form.get("current_password"),
        new_password: form.get("new_password"),
      });
      element.reset();
      setMessage("Your password has been updated.");
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSaving("");
    }
  };
  return (
    <>
      <PageHeader
        title="Account settings"
        description="Manage your personal details and keep your account secure."
      />
      {user && !user.email_verified && <VerifyEmailNotice />}
      {(message || formError) && (
        <div
          className={`ws-notice ${formError ? "error" : "success"}`}
          role={formError ? "alert" : "status"}
        >
          <Icon name={formError ? "error" : "check_circle"} />
          {formError || message}
        </div>
      )}
      {!user || error ? (
        <LoadState loading={loading} error={error} retry={reload} />
      ) : (
        <>
          <div className="ws-grid">
            <Panel title="Personal information">
              <form className="ws-form" onSubmit={saveProfile}>
                <div className="ws-form-grid">
                  <label className="ws-field">
                    Username
                    <input
                      name="username"
                      required
                      maxLength={150}
                      autoComplete="username"
                      defaultValue={user.username}
                    />
                  </label>
                  <label className="ws-field">
                    Phone number
                    <input
                      name="phone"
                      maxLength={20}
                      autoComplete="tel"
                      type="tel"
                      defaultValue={user.phone}
                      placeholder="+91"
                    />
                  </label>
                  <label className="ws-field full">
                    Email address
                    <input type="email" value={user.email} disabled />
                    <small>
                      Your email is the sign-in address for this account.
                    </small>
                  </label>
                </div>
                <div className="ws-form-actions">
                  <button className="ws-button" disabled={Boolean(saving)}>
                    {saving === "profile" ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </Panel>
            <Panel title="Account details">
              <dl className="ws-detail-list">
                <div>
                  <dt>Verification</dt>
                  <dd>
                    <Badge value={user.is_verified ? "verified" : "pending"} />
                  </dd>
                </div>
                <div>
                  <dt>Account type</dt>
                  <dd className="capitalize">{user.role}</dd>
                </div>
                <div>
                  <dt>Member since</dt>
                  <dd>{date(user.date_joined)}</dd>
                </div>
              </dl>
            </Panel>
          </div>
          <div className="ws-grid">
            <Panel title="Change password">
              <form className="ws-form" onSubmit={changePassword}>
                <div className="ws-form-grid">
                  <label className="ws-field full">
                    Current password
                    <input
                      type="password"
                      name="current_password"
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  <label className="ws-field">
                    New password
                    <input
                      type="password"
                      name="new_password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </label>
                  <label className="ws-field">
                    Confirm new password
                    <input
                      type="password"
                      name="confirm_password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  Use at least eight characters and avoid common or reused
                  passwords.
                </p>
                <div className="ws-form-actions">
                  <button className="ws-button" disabled={Boolean(saving)}>
                    {saving === "password" ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
