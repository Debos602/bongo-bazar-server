"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productFilterableFields = exports.productSearchableFields = void 0;
exports.productSearchableFields = [
    'name',
    'description',
    'slug',
    'sku'
]; // for search term
exports.productFilterableFields = [
    'name',
    'description',
    'slug',
    'sku',
    'isFeatured',
    'isPublished',
    'vendorId',
    'searchTerm'
]; // for all filtering
