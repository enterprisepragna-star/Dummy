import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const ADMIN_ROLES = ["admin", "super_admin"];

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-sm text-zinc-500">Authenticating…</div>;
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role || "admin";
  if (roles && roles.length && !roles.includes(role)) {
    // Redirect wrong-role user to their correct home.
    if (ADMIN_ROLES.includes(role)) return <Navigate to="/admin/products" replace />;
    return <Navigate to="/partner/dashboard" replace />;
  }
  return children;
}
