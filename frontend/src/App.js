import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";

import LoginPage from "@/pages/LoginPage";
import HomeRedirect from "@/pages/HomeRedirect";
import PublicCatalogPage from "@/pages/PublicCatalogPage";
import PublicQuotationPage from "@/pages/PublicQuotationPage";
import ProductsPage from "@/pages/admin/ProductsPage";
import CategoriesPage from "@/pages/admin/CategoriesPage";
import DiscountConfigPage from "@/pages/admin/DiscountConfigPage";
import PricingRulePage from "@/pages/admin/PricingRulePage";
import QuotationsListPage from "@/pages/admin/QuotationsListPage";
import NewQuotationPage from "@/pages/admin/NewQuotationPage";
import QuotationDetailPage from "@/pages/admin/QuotationDetailPage";
import SalesPage from "@/pages/admin/SalesPage";

const Admin = ({ children }) => (
  <ProtectedRoute>
    <AdminLayout>{children}</AdminLayout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/catalog" element={<PublicCatalogPage />} />
          <Route path="/q/:token" element={<PublicQuotationPage />} />

          <Route path="/admin" element={<Navigate to="/admin/products" replace />} />
          <Route path="/admin/products" element={<Admin><ProductsPage /></Admin>} />
          <Route path="/admin/categories" element={<Admin><CategoriesPage /></Admin>} />
          <Route path="/admin/pricing-rule" element={<Admin><PricingRulePage /></Admin>} />
          <Route path="/admin/discount" element={<Admin><DiscountConfigPage /></Admin>} />
          <Route path="/admin/quotations" element={<Admin><QuotationsListPage /></Admin>} />
          <Route path="/admin/quotations/new" element={<Admin><NewQuotationPage /></Admin>} />
          <Route path="/admin/quotations/:id" element={<Admin><QuotationDetailPage /></Admin>} />
          <Route path="/admin/sales" element={<Admin><SalesPage /></Admin>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
