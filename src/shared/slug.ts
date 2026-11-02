export const slugify = (text: string) => {
    const base = text
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '');
    return `${base || 'item'}-${Date.now().toString(36)}`;
};
