import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutError from "./pages/CheckoutError";
import About from "./pages/About";
import Contacts from "./pages/Contacts";
import Account from "./pages/Account";
import Blog from "./pages/Blog";
import ArticleDetail from "./pages/ArticleDetail";
import OrderTracking from "./pages/OrderTracking";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import LoginForm from "./components/auth/LoginForm";
import AdminLayout from "./components/admin/AdminLayout";
import ProtectedRoute from "./components/admin/ProtectedRoute";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import Categories from "./pages/admin/Categories";
import Banners from "./pages/admin/Banners";
import Clients from "./pages/admin/Clients";
import LoginHistory from "./pages/admin/LoginHistory";
import Orders from "./pages/admin/Orders";
import OrderDetail from "./pages/admin/OrderDetail";
import Settings from "./pages/admin/Settings";
import AuditLogs from "./pages/admin/AuditLogs";
import Articles from "./pages/admin/Articles";
import MediaLibrary from "./pages/admin/MediaLibrary";
import AnalyticsDashboard from "./pages/admin/AnalyticsDashboard";
import AnalyticsReports from "./pages/admin/AnalyticsReports";
import ABTesting from "./pages/admin/ABTesting";
import MarketplaceSettings from "./pages/admin/MarketplaceSettings";
import MarketplaceDashboard from "./pages/admin/MarketplaceDashboard";
import PriceManagement from "./pages/admin/PriceManagement";
import ReviewsModeration from "./pages/admin/ReviewsModeration";
import TelegramSettings from "./pages/admin/TelegramSettings";
import DeliveryServices from "./pages/admin/DeliveryServices";
import PaymentGateways from "./pages/admin/PaymentGateways";
import AnalyticsSettings from "./pages/admin/AnalyticsSettings";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AuthCallback from "./pages/auth/AuthCallback";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import { ErrorBoundary } from "./components/admin/ErrorBoundary";
import { Analytics } from "./components/Analytics";
import { ThemeDecorations } from "./components/ThemeDecorations";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <WishlistProvider>
            <ErrorBoundary>
              <Analytics />
            </ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ThemeDecorations />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/category/:category" element={<CategoryPage />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/checkout/error" element={<CheckoutError />} />
              <Route path="/about" element={<About />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/account" element={<Account />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<ArticleDetail />} />
              <Route path="/tracking" element={<OrderTracking />} />
              <Route path="/terms" element={<TermsOfService />} />
              
              {/* Auth routes */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              
              {/* Admin routes */}
              <Route path="/admin/login" element={<LoginForm />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <AdminLayout />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="categories" element={<Categories />} />
                <Route path="banners" element={<Banners />} />
                <Route path="articles" element={<Articles />} />
                <Route path="media" element={<MediaLibrary />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:id" element={<OrderDetail />} />
                <Route path="clients" element={<Clients />} />
                <Route path="login-history" element={<LoginHistory />} />
                <Route path="settings" element={<Settings />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route path="analytics/reports" element={<AnalyticsReports />} />
                <Route path="analytics/ab-testing" element={<ABTesting />} />
                <Route path="marketplace" element={<MarketplaceSettings />} />
                <Route path="marketplace/dashboard" element={<MarketplaceDashboard />} />
                <Route path="marketplace/prices" element={<PriceManagement />} />
                <Route path="reviews" element={<ReviewsModeration />} />
                <Route path="telegram" element={<TelegramSettings />} />
                <Route path="delivery" element={<DeliveryServices />} />
                <Route path="payments" element={<PaymentGateways />} />
                <Route path="analytics/settings" element={<AnalyticsSettings />} />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </WishlistProvider>
        </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
