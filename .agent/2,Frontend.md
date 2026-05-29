# Frontend Development Rules – Smart Travel Ecosystem

## 1. Purpose

This document defines strict rules for all frontend development and AI-assisted code generation.

The goal is to ensure:

* Exact alignment with backend schemas and services
* No hallucinated UI or logic
* Predictable, scalable, and maintainable frontend structure

---

## 2. Scope

These rules apply to:

* Customer Web Application
* Admin Web Dashboard
* Owner Portal

All frontend code must follow these rules without exception.

---

## 3. Source of Truth

Frontend must strictly depend on:

1. Backend API contracts
2. Database schema (indirectly via APIs)
3. Defined user flows from system diagrams

Frontend must NOT:

* Assume backend responses
* Create fields not present in APIs
* Infer missing data structures

---

## 4. Architectural Principles

### 4.1 Separation of Concerns

Frontend must be divided into:

* UI Components (presentation only)
* Feature Modules (business logic)
* API Services (backend communication)
* State Management (global/local state)

No layer should violate another.

---

### 4.2 Feature-Based Structure

Each feature must be isolated:

* auth
* booking
* stay
* vehicle
* attraction
* reviews
* dashboard

Each feature must contain:

* components
* hooks
* services (if needed)
* state (if needed)

---

### 4.3 Reusability

Reusable components must be created for:

* PropertyCard
* BookingCard
* Filters
* ReviewCard
* FormInputs
* Buttons

Duplication of UI logic is not allowed.

---

## 5. Page-Level Rules (STRICT)

### 5.1 Home Page

Must include:

* Search bar (location, dates, guests)
* Service selector (Stay / Vehicle / Attraction)
* Featured listings

Must NOT:

* Perform booking logic
* Call unnecessary APIs

---

### 5.2 Search Results Page

Must:

* Fetch data via API
* Apply filters (price, rating, amenities)
* Support sorting

Must NOT:

* Hardcode results
* Perform backend filtering locally if API exists

---

### 5.3 Stay Details Page

Must:

* Display property data from API
* Show rooms, pricing, availability
* Show reviews

Must NOT:

* Compute availability logic locally
* Modify backend data

---

### 5.4 Booking Page

Must:

* Collect user input (dates, guests)
* Display price breakdown from backend
* Pass validated data to backend

Must NOT:

* Calculate final pricing independently
* Confirm booking without backend response

---

### 5.5 Payment Page

Must:

* Call payment API
* Show transaction status

Must NOT:

* Simulate success/failure
* Store sensitive payment data

---

### 5.6 Confirmation Page

Must:

* Display booking details from backend
* Show booking ID and status

Must NOT:

* Generate fake confirmation data

---

### 5.7 Vehicle Booking Page

Must:

* Accept pickup/drop inputs
* Display fare from backend
* Track ride status via API

Must NOT:

* Simulate tracking logic

---

### 5.8 Attractions Page

Must:

* Fetch attractions from API
* Allow slot selection

Must NOT:

* Manage availability locally

---

### 5.9 User Dashboard

Must:

* Display bookings, saved places, reviews
* Fetch all data via APIs

Must NOT:

* Store critical data only in frontend state

---

## 6. API Integration Rules

Frontend must:

* Use centralized service files for API calls
* Use consistent request/response handling
* Handle loading and error states

Example:

* bookingService
* authService
* stayService

Frontend must NOT:

* Call APIs directly inside UI components
* Duplicate API logic

---

## 7. State Management Rules

Must:

* Use global state only when necessary (auth, user session)
* Keep feature-specific state local

Must NOT:

* Store backend source-of-truth data permanently in frontend
* Create unnecessary global states

---

## 8. Data Handling Rules

Must:

* Validate user inputs before API calls
* Use backend as source of truth
* Normalize frontend data when needed

Must NOT:

* Modify backend data structures
* Create derived data that conflicts with backend

---

## 9. Error Handling

Must:

* Handle API errors gracefully
* Show user-friendly messages
* Retry where applicable

Must NOT:

* Fail silently
* Crash UI on API failure

---

## 10. Performance Rules

Must:

* Use lazy loading for pages
* Avoid unnecessary re-renders
* Optimize API calls

Must NOT:

* Fetch duplicate data
* Load heavy components unnecessarily

---

## 11. Security Rules

Must:

* Use token-based authentication (JWT)
* Protect routes based on roles
* Avoid exposing sensitive data

Must NOT:

* Store tokens insecurely
* Expose API keys in frontend

---

## 12. UI Consistency Rules

Must:

* Maintain consistent design system
* Use shared components
* Follow spacing, typography standards

Must NOT:

* Create inconsistent UI patterns
* Mix multiple design styles

---

## 13. Workflow for Implementation

For every task:

1. Identify feature (booking, stay, etc.)
2. Identify required API
3. Map UI → API → state
4. Build components
5. Integrate API
6. Handle loading + error states
7. Validate output with schema

---

## 14. Success Criteria

Frontend is correct only if:

* It strictly follows backend APIs
* It does not assume or invent data
* It matches defined user flows
* It maintains separation of concerns
* It is scalable and maintainable

---

## 15. Enforcement Rule

If any frontend violates:

* API contracts
* Schema alignment
* Architectural separation

It must be corrected immediately before further development.

---
