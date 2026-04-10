/**
 * ProctorAI — Service Layer Index
 *
 * Architecture:
 *   tokenStore  → Secure in-memory JWT storage (XOR-obfuscated sessionStorage fallback)
 *   cache       → TTL request cache with stale-while-revalidate & deduplication
 *   api (http)  → Core HTTP client with auto token refresh
 *   authService → Auth endpoints (login, register, profile)
 *   examService → Exam CRUD + candidate exam flow
 *   proctorService → Violation reporting + admin monitoring
 */
export { default as tokenStore } from './tokenStore';
export { default as cache } from './cache';
export { default as http, ApiError } from './api';
export { default as authService } from './authService';
export { default as examService } from './examService';
export { default as proctorService } from './proctorService';
