export const productSearchableFields: string[] = ['name', 'description', 'slug', 'sku'];

export const productFilterableFields: string[] = [
    'isFeatured',
    'vendorId',
    'categoryId',
    'category',
    'minPrice',
    'maxPrice',
    'searchTerm'
];

export const productSortableFields: string[] = ['createdAt', 'price', 'rating', 'name', 'stock'];
