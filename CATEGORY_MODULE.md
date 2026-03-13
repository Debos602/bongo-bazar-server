# Category Module - API Documentation

## Overview
The Category module provides CRUD operations for managing product categories. It maintains the relationship between categories and products through the `ProductCategory` junction table.

## Database Model
Category is already defined in the Prisma schema with the following structure:

```prisma
model Category {
  id        Int       @id @default(autoincrement())
  name      String
  slug      String    @unique
  products  ProductCategory[]
}

model ProductCategory {
  productId  Int
  categoryId Int
  product    Product  @relation(fields: [productId], references: [id])
  category   Category @relation(fields: [categoryId], references: [id])
  @@id([productId, categoryId])
}
```

## File Structure
```
src/app/modules/category/
├── category.controller.ts      # Request handlers
├── category.service.ts         # Business logic
├── category.routes.ts          # API endpoints with auth/validation
└── category.validation.ts      # Input validation (Zod)
```

## API Endpoints

### 1. Create Category (POST)
- **Endpoint**: `POST /api/v1/category`
- **Auth**: Admin only
- **Request Body**:
```json
{
  "name": "Electronics",
  "slug": "electronics"
}
```
- **Response (201 Created)**:
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Category created successfully!",
  "data": {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics"
  }
}
```
- **Validation Rules**:
  - `name`: Required, string, max 255 characters
  - `slug`: Required, string, max 255 characters, must be unique

---

### 2. Get All Categories (GET)
- **Endpoint**: `GET /api/v1/category`
- **Auth**: Vendor, Admin, and Users
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 10)
  - `sortBy` (default: 'id')
  - `sortOrder` ('asc' or 'desc')
  
- **Example**: `GET /api/v1/category?page=1&limit=10&sortBy=name&sortOrder=asc`

- **Response (200 OK)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Categories retrieved successfully!",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5
  },
  "data": [
    {
      "id": 1,
      "name": "Electronics",
      "slug": "electronics",
      "products": [
        {
          "categoryId": 1,
          "productId": 10,
          "product": {
            "id": 10,
            "name": "Laptop",
            "price": 999.99,
            "image": "url..."
          }
        }
      ]
    }
  ]
}
```

---

### 3. Get Category by ID (GET)
- **Endpoint**: `GET /api/v1/category/:id`
- **Auth**: Vendor, Admin, and Users
- **Response (200 OK)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Category retrieved successfully!",
  "data": {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics",
    "products": [
      {
        "categoryId": 1,
        "productId": 10,
        "product": {
          "id": 10,
          "name": "Laptop",
          "price": 999.99,
          "image": "url...",
          "description": "..."
        }
      }
    ]
  }
}
```

---

### 4. Update Category (PATCH)
- **Endpoint**: `PATCH /api/v1/category/:id`
- **Auth**: Admin only
- **Request Body** (both optional):
```json
{
  "name": "Updated Electronics",
  "slug": "updated-electronics"
}
```
- **Response (200 OK)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Category updated successfully!",
  "data": {
    "id": 1,
    "name": "Updated Electronics",
    "slug": "updated-electronics"
  }
}
```
- **Validation Rules**:
  - `name`: Optional, string, max 255 characters
  - `slug`: Optional, string, max 255 characters (must be unique if provided)

---

### 5. Delete Category (DELETE)
- **Endpoint**: `DELETE /api/v1/category/:id`
- **Auth**: Admin only
- **Restrictions**: Cannot delete categories that have associated products
- **Response (200 OK)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Category deleted successfully!",
  "data": {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics"
  }
}
```
- **Error Response (400 Bad Request)** - If category has products:
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Cannot delete category with associated products"
}
```

---

## Permission Matrix

| Operation | SUPER_ADMIN | ADMIN | VENDOR | USER |
|-----------|:-----------:|:-----:|:------:|:----:|
| Create    |      ✓      |   ✓   |   ✗    |  ✗   |
| Get All   |      ✓      |   ✓   |   ✓    |  ✓   |
| Get By ID |      ✓      |   ✓   |   ✓    |  ✓   |
| Update    |      ✓      |   ✓   |   ✗    |  ✗   |
| Delete    |      ✓      |   ✓   |   ✗    |  ✗   |

---

## Error Responses

### 404 Not Found
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Category not found!"
}
```

### 400 Bad Request (Duplicate Slug)
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Category slug already exists"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Unauthorized request"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "success": false,
  "message": "Forbidden: Admin access required"
}
```

---

## Implementation Notes

1. **Category-Product Relationship**: Already maintained through the `ProductCategory` junction table (many-to-many relationship)

2. **Slug Uniqueness**: Enforced at both database and service layer for data integrity

3. **Cascade Protection**: Categories cannot be deleted if they have associated products (prevents data inconsistency)

4. **Pagination**: All list endpoints support pagination with configurable page size and sorting

5. **Authentication**: Uses JWT-based authentication with role-based access control

6. **Validation**: Uses Zod for schema validation to ensure data integrity

---

## Testing with cURL

### Create Category
```bash
curl -X POST http://localhost:3000/api/v1/category \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Electronics","slug":"electronics"}'
```

### Get All Categories
```bash
curl -X GET "http://localhost:3000/api/v1/category?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

### Get Category by ID
```bash
curl -X GET http://localhost:3000/api/v1/category/1 \
  -H "Authorization: Bearer <token>"
```

### Update Category
```bash
curl -X PATCH http://localhost:3000/api/v1/category/1 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Electronics","slug":"updated-electronics"}'
```

### Delete Category
```bash
curl -X DELETE http://localhost:3000/api/v1/category/1 \
  -H "Authorization: Bearer <admin_token>"
```
