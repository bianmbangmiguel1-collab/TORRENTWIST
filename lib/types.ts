// torrenttwist/lib/types.ts

// ============================================
// UTILISATEURS
// ============================================

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'moderator'
  isAdmin?: boolean
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
  isActive?: boolean
  emailVerified?: boolean
  avatar?: string
  phone?: string
  address?: string
}

export interface UserCreate {
  email: string
  password: string
  name: string
  role?: 'admin' | 'user' | 'moderator'
}

export interface UserUpdate {
  email?: string
  name?: string
  role?: 'admin' | 'user' | 'moderator'
  isActive?: boolean
  avatar?: string
  phone?: string
  address?: string
}

// ============================================
// AUTHENTIFICATION
// ============================================

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterData {
  email: string
  password: string
  name: string
  role?: 'admin' | 'user' | 'moderator'
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: Partial<User>
  error?: string
  message?: string
}

export interface TokenPayload {
  id: string
  email: string
  name: string
  role: string
  isAdmin: boolean
  iat?: number
  exp?: number
}

// ============================================
// PRODUITS
// ============================================

export interface Product {
  id: string
  title: string
  description: string
  price: number
  category: string
  images: string[]
  stock: number
  sales: number
  revenue: number
  rating: number
  reviews: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  userId?: string
  user?: User
}

export interface ProductCreate {
  title: string
  description: string
  price: number
  category: string
  images?: string[]
  stock?: number
}

export interface ProductUpdate {
  title?: string
  description?: string
  price?: number
  category?: string
  images?: string[]
  stock?: number
  isActive?: boolean
}

// ============================================
// COMMANDES
// ============================================

export interface Order {
  id: string
  orderNumber: string
  userId: string
  user: User
  products: OrderProduct[]
  totalAmount: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded'
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  paymentMethod: 'card' | 'cash' | 'mobile_money'
  shippingAddress: Address
  createdAt: Date
  updatedAt: Date
}

export interface OrderProduct {
  productId: string
  product: Product
  quantity: number
  price: number
  total: number
}

export interface Address {
  street: string
  city: string
  state: string
  country: string
  postalCode: string
  phone: string
}

export interface OrderCreate {
  userId: string
  products: { productId: string; quantity: number }[]
  shippingAddress: Address
  paymentMethod: 'card' | 'cash' | 'mobile_money'
}

// ============================================
// STATISTIQUES
// ============================================

export interface AdminStats {
  revenue: number
  orders: number
  customers: number
  conversion: number
  totalProducts: number
  pendingOrders: number
  newCustomers: number
  averageOrderValue: number
  topProducts: Product[]
  recentOrders: Order[]
  activities: Activity[]
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string
    fill?: boolean
  }[]
}

// ============================================
// ACTIVITÉS
// ============================================

export interface Activity {
  id: string
  action: 'login' | 'logout' | 'create_product' | 'update_product' | 'delete_product' | 'update_user' | 'delete_user' | 'create_order' | 'update_order' | 'delete_order'
  userId?: string
  user?: User
  details?: any
  ip?: string
  userAgent?: string
  createdAt: Date
}

export interface ActivityCreate {
  action: Activity['action']
  userId?: string
  details?: any
  ip?: string
  userAgent?: string
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface Notification {
  id: string
  userId: string
  user: User
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  link?: string
  createdAt: Date
  readAt?: Date
}

export interface NotificationCreate {
  userId: string
  title: string
  message: string
  type?: Notification['type']
  link?: string
}

// ============================================
// PARAMÈTRES
// ============================================

export interface Settings {
  id: string
  key: string
  value: any
  category: 'general' | 'payment' | 'shipping' | 'security' | 'email' | 'appearance'
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
  status: number
}

export interface PaginatedResponse<T = any> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiErrorResponse {
  success: false
  error: string
  message: string
  status: number
  timestamp: string
}

// ============================================
// FILTRES ET PAGINATION
// ============================================

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ProductFilters extends PaginationParams {
  category?: string
  minPrice?: number
  maxPrice?: number
  search?: string
  inStock?: boolean
}

export interface OrderFilters extends PaginationParams {
  status?: Order['status']
  paymentStatus?: Order['paymentStatus']
  startDate?: Date
  endDate?: Date
}

export interface UserFilters extends PaginationParams {
  role?: User['role']
  isActive?: boolean
  search?: string
}

// ============================================
// CONFIGURATION
// ============================================

export interface AppConfig {
  appName: string
  appVersion: string
  environment: 'development' | 'production' | 'test'
  apiUrl: string
  isProduction: boolean
  isDevelopment: boolean
}

// ============================================
// SÉCURITÉ
// ============================================

export interface SecurityHeaders {
  'X-Content-Type-Options': string
  'X-Frame-Options': string
  'X-XSS-Protection': string
  'Content-Security-Policy'?: string
  'Referrer-Policy': string
  'Permissions-Policy': string
}

// ============================================
// EXPORT PAR DÉFAUT
// ============================================

export default {
  User,
  UserCreate,
  UserUpdate,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  TokenPayload,
  Product,
  ProductCreate,
  ProductUpdate,
  Order,
  OrderCreate,
  OrderProduct,
  Address,
  AdminStats,
  ChartData,
  Activity,
  ActivityCreate,
  Notification,
  NotificationCreate,
  Settings,
  ApiResponse,
  PaginatedResponse,
  ApiErrorResponse,
  PaginationParams,
  ProductFilters,
  OrderFilters,
  UserFilters,
  AppConfig,
  SecurityHeaders
}